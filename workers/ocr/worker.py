#!/usr/bin/env python3
"""
OCR Worker - Extracts text from menu images and PDFs using PaddleOCR

Responsibilities:
- Poll for OCR jobs from database
- Download images/PDFs from Supabase Storage
- Preprocess images (deskew, denoise, upscale)
- Perform layout detection
- Extract text with PaddleOCR
- Postprocess results (extract prices, sections)
- Store OCR results
- Enqueue parsing jobs
"""

import os
import sys
import time
import json
import re
import hashlib
from io import BytesIO
from typing import List, Dict, Any, Tuple, Optional

import cv2
import numpy as np
from PIL import Image
from pdf2image import convert_from_bytes
from paddleocr import PaddleOCR
from supabase import create_client, Client

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize PaddleOCR (English + common languages)
ocr = PaddleOCR(
    lang='en',
    use_angle_cls=True,
    show_log=False,
    use_gpu=False  # Set to True if GPU available
)

class OCRProcessor:
    """OCR processing pipeline"""

    def __init__(self):
        self.supported_formats = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for better OCR results
        - Deskew
        - Denoise
        - Upscale if needed
        - Adaptive thresholding
        """
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

        # Upscale if resolution is low
        height, width = denoised.shape
        if height < 1200 or width < 900:
            scale_factor = max(1200 / height, 900 / width)
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            denoised = cv2.resize(denoised, (new_width, new_height), interpolation=cv2.INTER_CUBIC)

        # Adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11, 2
        )

        # Deskew
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) > 0:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle

            # Only deskew if angle is significant
            if abs(angle) > 0.5:
                (h, w) = thresh.shape
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                thresh = cv2.warpAffine(
                    thresh, M, (w, h),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REPLICATE
                )

        return thresh

    def detect_layout(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect menu structure (sections, columns, tables)
        Returns bounding boxes with types
        """
        # For now, return full image as single region
        # In production, use layout detection model
        height, width = image.shape[:2]
        return [{
            'type': 'full_page',
            'bbox': [0, 0, width, height],
            'confidence': 1.0
        }]

    def extract_text(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Extract text using PaddleOCR
        Returns text blocks with coordinates and confidence
        """
        result = ocr.ocr(image, cls=True)

        if not result or not result[0]:
            return []

        text_blocks = []
        for line in result[0]:
            bbox = line[0]
            text = line[1][0]
            confidence = line[1][1]

            text_blocks.append({
                'bbox': bbox,
                'text': text,
                'confidence': confidence,
            })

        return text_blocks

    def postprocess(self, text_blocks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Postprocess OCR results:
        - Extract prices
        - Detect sections
        - Normalize text
        - Extract item structure
        """
        full_text = '\n'.join([block['text'] for block in text_blocks])

        # Extract prices
        prices = self.extract_prices(full_text)

        # Detect sections
        sections = self.detect_sections(text_blocks)

        # Extract menu items (simplified)
        items = self.extract_items(text_blocks, sections)

        return {
            'full_text': full_text,
            'text_blocks': text_blocks,
            'prices': prices,
            'sections': sections,
            'items': items,
            'block_count': len(text_blocks),
        }

    def extract_prices(self, text: str) -> List[Dict[str, Any]]:
        """Extract prices with currency normalization"""
        price_patterns = [
            r'\$\s*(\d+(?:\.\d{2})?)',  # $10.99
            r'(\d+(?:\.\d{2})?)\s*USD',  # 10.99 USD
            r'€\s*(\d+(?:[.,]\d{2})?)',  # €10,99 or €10.99
            r'£\s*(\d+(?:\.\d{2})?)',  # £10.99
        ]

        prices = []
        for pattern in price_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                price_str = match.group(1)
                # Normalize to USD format
                price_float = float(price_str.replace(',', '.'))

                currency = 'USD'
                if '€' in match.group(0):
                    currency = 'EUR'
                elif '£' in match.group(0):
                    currency = 'GBP'

                prices.append({
                    'value': price_float,
                    'currency': currency,
                    'raw': match.group(0),
                    'position': match.start(),
                })

        return prices

    def detect_sections(self, text_blocks: List[Dict[str, Any]]) -> List[str]:
        """Detect menu sections (appetizers, mains, desserts, etc.)"""
        section_keywords = {
            'appetizers': ['appetizer', 'starter', 'small plate', 'sharing'],
            'salads': ['salad', 'greens'],
            'soups': ['soup', 'bisque', 'chowder'],
            'mains': ['main', 'entree', 'entrée', 'pasta', 'burger', 'sandwich'],
            'sides': ['side', 'accompaniment'],
            'desserts': ['dessert', 'sweet', 'pastry'],
            'drinks': ['drink', 'beverage', 'cocktail', 'wine', 'beer'],
        }

        detected_sections = []
        for block in text_blocks:
            text_lower = block['text'].lower()
            for section, keywords in section_keywords.items():
                if any(keyword in text_lower for keyword in keywords):
                    if section not in detected_sections:
                        detected_sections.append(section)

        return detected_sections

    def extract_items(self, text_blocks: List[Dict[str, Any]], sections: List[str]) -> List[Dict[str, Any]]:
        """Extract menu items (simplified extraction)"""
        items = []
        current_section = sections[0] if sections else 'unknown'

        for i, block in enumerate(text_blocks):
            text = block['text']

            # Check if this is a section header
            text_lower = text.lower()
            for section in ['appetizers', 'mains', 'desserts', 'drinks', 'salads', 'soups']:
                if section in text_lower:
                    current_section = section
                    continue

            # Check if this looks like a menu item (has letters and possibly a price)
            if len(text) > 3 and any(c.isalpha() for c in text):
                # Look for price in next few blocks
                price = None
                for j in range(i, min(i + 3, len(text_blocks))):
                    prices = self.extract_prices(text_blocks[j]['text'])
                    if prices:
                        price = prices[0]
                        break

                items.append({
                    'name': text,
                    'section': current_section,
                    'price': price,
                    'bbox': block['bbox'],
                })

        return items


def process_ocr_job(job: Dict[str, Any]) -> Dict[str, Any]:
    """Process a single OCR job"""
    job_id = job['id']
    payload = job['payload']
    artifact_id = payload['artifact_id']
    storage_path = payload['storage_path']

    print(f"[OCR] Processing job {job_id}, artifact {artifact_id}")

    # Download file from storage
    bucket = storage_path.split('/')[0] if '/' not in storage_path else 'artifacts'
    file_path = storage_path if '/' in storage_path else storage_path

    response = supabase.storage.from_(bucket).download(file_path)
    file_bytes = response

    # Determine file type
    file_ext = storage_path.split('.')[-1].lower()

    # Convert to images
    images = []
    if file_ext == 'pdf':
        # Convert PDF pages to images
        images = convert_from_bytes(file_bytes, dpi=300)
        images = [cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR) for img in images]
    else:
        # Load image
        img = Image.open(BytesIO(file_bytes))
        images = [cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)]

    # Process each page/image
    processor = OCRProcessor()
    all_results = []

    for idx, image in enumerate(images):
        print(f"[OCR] Processing page {idx + 1}/{len(images)}")

        # Preprocess
        preprocessed = processor.preprocess(image)

        # Detect layout
        layout = processor.detect_layout(preprocessed)

        # Extract text
        text_blocks = processor.extract_text(preprocessed)

        # Postprocess
        result = processor.postprocess(text_blocks)
        result['page_number'] = idx + 1

        all_results.append(result)

    # Combine results from all pages
    combined_result = {
        'pages': all_results,
        'total_pages': len(images),
        'total_text': '\n\n'.join([page['full_text'] for page in all_results]),
        'all_items': [item for page in all_results for item in page['items']],
    }

    # Store OCR results in storage
    result_json = json.dumps(combined_result, indent=2)
    result_path = f"{storage_path.rsplit('.', 1)[0]}-ocr-result.json"

    supabase.storage.from_(bucket).upload(
        result_path,
        result_json.encode('utf-8'),
        file_options={'contentType': 'application/json'}
    )

    # Update artifact with OCR results
    supabase.from_('raw_artifacts').update({
        'ocr_result': combined_result,
        'processed_at': 'now()',
    }).eq('id', artifact_id).execute()

    # Enqueue parsing job
    supabase.from_('jobs').insert({
        'type': 'parse',
        'status': 'pending',
        'payload': {
            'place_id': payload['place_id'],
            'artifact_id': artifact_id,
            'ocr_result': combined_result,
        }
    }).execute()

    print(f"[OCR] Completed job {job_id}, found {len(combined_result['all_items'])} items")
    return combined_result


def main():
    """Main worker loop"""
    print("[OCR] Worker started, polling for jobs...")

    while True:
        try:
            # Fetch pending OCR jobs
            response = supabase.from_('jobs').select('*').eq('type', 'ocr').eq('status', 'pending').limit(1).execute()

            if response.data and len(response.data) > 0:
                job = response.data[0]

                # Mark as running
                supabase.from_('jobs').update({'status': 'running'}).eq('id', job['id']).execute()

                # Process job
                try:
                    result = process_ocr_job(job)

                    # Mark as completed
                    supabase.from_('jobs').update({
                        'status': 'completed',
                        'result': result,
                        'completed_at': 'now()'
                    }).eq('id', job['id']).execute()

                except Exception as e:
                    print(f"[OCR] Job {job['id']} failed: {e}")
                    supabase.from_('jobs').update({
                        'status': 'failed',
                        'error_message': str(e)
                    }).eq('id', job['id']).execute()
            else:
                # No jobs, wait before polling again
                time.sleep(5)

        except Exception as e:
            print(f"[OCR] Error in main loop: {e}")
            time.sleep(10)


if __name__ == '__main__':
    main()
