# Task 06: OCR Worker

## Phase
Phase 1: Crawler + OCR Workers (Weeks 3-5)

## Objective
Implement OCR workers to extract text from menu images and PDFs using PaddleOCR.

## Description
Create OCR processing pipeline with image preprocessing, layout detection, text extraction using PaddleOCR, and postprocessing to extract structured information like prices and sections.

## Core Pipeline Stages

### 1. Preprocessing
- Deskew using cv2.warpAffine
- Denoise with cv2.fastNlMeansDenoising
- Upscale if resolution < 300 DPI
- Adaptive thresholding

### 2. Layout Detection
- Detect menu sections, columns, tables
- Identify headers and structure
- Return bounding boxes with types

### 3. OCR Extraction
- Use PaddleOCR for text extraction
- Extract text with confidence scores per region
- Handle multiple languages

### 4. Postprocessing
- Extract prices using regex ($X.XX, €X,XX)
- Currency normalization
- Spell-check with custom dictionary
- Fuzzy ingredient matching

### 5. Section Detection
- Classify: appetizers, mains, desserts, drinks
- Use layout + keywords + ML model

## Tasks
1. Set up Python environment with dependencies
2. Install and configure PaddleOCR
3. Implement image preprocessing functions
4. Create layout detection module
5. Implement OCR extraction
6. Build postprocessing pipeline
7. Create section detection logic
8. Integrate with job queue
9. Store OCR results
10. Enqueue parsing jobs
11. Test with diverse menu images
12. Measure and optimize accuracy

## Implementation Details

```python
class OCRWorker:
    def preprocess(self, image):
        """Image preprocessing"""
        pass

    def layout_detection(self, image):
        """Detect menu structure"""
        pass

    def ocr_extract(self, image_regions):
        """Extract text with PaddleOCR"""
        pass

    def postprocess(self, ocr_results):
        """Extract prices, normalize text"""
        pass

    def detect_sections(self, text_blocks):
        """Classify menu sections"""
        pass
```

## Success Criteria
- [ ] PaddleOCR installed and working
- [ ] Preprocessing pipeline functional
- [ ] Layout detection working
- [ ] Text extraction accurate (>85%)
- [ ] Price extraction working
- [ ] Section detection functional
- [ ] OCR workers processing jobs from queue
- [ ] Results stored to Supabase Storage
- [ ] Parse jobs enqueued
- [ ] 3+ worker instances running
- [ ] Performance optimized

## Dependencies
- Task 03: Worker Infrastructure
- Task 05: Crawler Service

## Estimated Time
7-10 days

## Notes
- Consider PaddleOCR vs Tesseract tradeoffs
- GPU acceleration recommended for performance
- Store intermediate results for debugging
- Handle various image qualities and formats
- Consider hybrid approach with fallback OCR
