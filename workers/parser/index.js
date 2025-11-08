/**
 * Parser Service
 * Parses OCR output and JSON-LD data into structured menu items
 */

const { createWorker, gracefulShutdown } = require('../shared/queue');
const { supabase, createJob, markJobCompleted, markJobFailed } = require('../shared/supabase');

// Parser configuration
const SECTION_KEYWORDS = {
  appetizers: ['appetizer', 'starter', 'small plate', 'tapas', 'mezze', 'antipasti'],
  mains: ['main', 'entree', 'entrée', 'large plate', 'dinner', 'lunch'],
  desserts: ['dessert', 'sweet', 'pastry', 'cake', 'ice cream'],
  drinks: ['drink', 'beverage', 'cocktail', 'wine', 'beer', 'juice', 'coffee', 'tea'],
  sides: ['side', 'accompaniment'],
  salads: ['salad', 'greens'],
  soups: ['soup', 'stew', 'chowder', 'bisque'],
  breakfast: ['breakfast', 'brunch', 'morning'],
};

/**
 * Parse OCR text into menu items
 */
function parseOCRText(ocrText, sections = []) {
  const items = [];
  const lines = ocrText.split('\n').filter(line => line.trim());

  let currentSection = null;
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line is a section header
    const detectedSection = detectSection(line);
    if (detectedSection) {
      currentSection = detectedSection;
      continue;
    }

    // Try to parse as menu item
    const parsedItem = parseMenuItem(line, lines[i + 1]);
    if (parsedItem) {
      parsedItem.section = currentSection || 'other';
      items.push(parsedItem);

      // If we used the next line for description, skip it
      if (parsedItem._usedNextLine) {
        i++;
      }
    }
  }

  return items;
}

/**
 * Detect section from line text
 */
function detectSection(line) {
  const lowerLine = line.toLowerCase();

  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerLine.includes(keyword)) {
        return section;
      }
    }
  }

  return null;
}

/**
 * Parse a menu item from text line(s)
 */
function parseMenuItem(line, nextLine = '') {
  // Pattern: Item Name ... $X.XX
  // Pattern: Item Name $X.XX Description

  const priceMatch = extractPrice(line);
  if (!priceMatch) {
    return null; // No price, probably not a menu item
  }

  const { price, currency, priceIndex } = priceMatch;

  // Extract name (everything before price)
  let name = line.substring(0, priceIndex).trim();
  // Remove trailing dots/dashes
  name = name.replace(/[.\-\s]+$/, '').trim();

  // Extract description (everything after price on same line, or next line)
  let description = line.substring(priceIndex + priceMatch.text.length).trim();
  let usedNextLine = false;

  if (!description && nextLine && !extractPrice(nextLine)) {
    // Next line might be description if it has no price
    description = nextLine.trim();
    usedNextLine = true;
  }

  if (!name) {
    return null;
  }

  return {
    name,
    description: description || null,
    price,
    currency,
    _usedNextLine: usedNextLine,
  };
}

/**
 * Extract price from text
 */
function extractPrice(text) {
  // Price patterns: $X.XX, €X.XX, £X.XX, X.XX USD, etc.
  const patterns = [
    /\$\s*(\d+\.?\d*)/,           // $12.99 or $12
    /€\s*(\d+[.,]?\d*)/,          // €12.99 or €12,99
    /£\s*(\d+\.?\d*)/,            // £12.99
    /(\d+\.?\d*)\s*USD/i,         // 12.99 USD
    /(\d+\.?\d*)\s*EUR/i,         // 12.99 EUR
    /(\d+\.?\d*)\s*GBP/i,         // 12.99 GBP
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(match[1].replace(',', '.'));
      const currency = detectCurrency(match[0]);

      return {
        price,
        currency,
        text: match[0],
        priceIndex: match.index,
      };
    }
  }

  return null;
}

/**
 * Detect currency from price string
 */
function detectCurrency(priceText) {
  if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
  if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
  if (priceText.includes('£') || priceText.includes('GBP')) return 'GBP';
  return 'USD'; // Default
}

/**
 * Parse JSON-LD structured data
 */
function parseJSONLD(jsonLd) {
  const items = [];

  if (!jsonLd) return items;

  // Handle Menu schema
  if (jsonLd['@type'] === 'Menu' && jsonLd.hasMenuItem) {
    const menuItems = Array.isArray(jsonLd.hasMenuItem)
      ? jsonLd.hasMenuItem
      : [jsonLd.hasMenuItem];

    for (const item of menuItems) {
      const parsed = parseJSONLDMenuItem(item);
      if (parsed) items.push(parsed);
    }
  }

  // Handle MenuSection schema
  if (jsonLd['@type'] === 'MenuSection' && jsonLd.hasMenuItem) {
    const section = jsonLd.name || 'other';
    const menuItems = Array.isArray(jsonLd.hasMenuItem)
      ? jsonLd.hasMenuItem
      : [jsonLd.hasMenuItem];

    for (const item of menuItems) {
      const parsed = parseJSONLDMenuItem(item);
      if (parsed) {
        parsed.section = section.toLowerCase();
        items.push(parsed);
      }
    }
  }

  return items;
}

/**
 * Parse individual JSON-LD menu item
 */
function parseJSONLDMenuItem(item) {
  if (item['@type'] !== 'MenuItem') return null;

  const result = {
    name: item.name,
    description: item.description || null,
    section: null,
  };

  // Parse offers for price
  if (item.offers) {
    const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
    if (offer.price) {
      result.price = parseFloat(offer.price);
      result.currency = offer.priceCurrency || 'USD';
    }
  }

  // Parse nutrition for dietary info
  if (item.nutrition) {
    result.dietary_labels = [];
    if (item.nutrition.dietaryRestriction) {
      const restrictions = Array.isArray(item.nutrition.dietaryRestriction)
        ? item.nutrition.dietaryRestriction
        : [item.nutrition.dietaryRestriction];

      result.dietary_labels = restrictions.map(r => r.toLowerCase());
    }
  }

  return result;
}

/**
 * Combine OCR and JSON-LD results
 */
function combineResults(ocrItems, jsonLdItems) {
  // Prefer JSON-LD when available, supplement with OCR
  const combined = [];
  const jsonLdNames = new Set(jsonLdItems.map(i => i.name.toLowerCase()));

  // Add all JSON-LD items (they're more reliable)
  combined.push(...jsonLdItems);

  // Add OCR items that don't exist in JSON-LD
  for (const ocrItem of ocrItems) {
    if (!jsonLdNames.has(ocrItem.name.toLowerCase())) {
      combined.push(ocrItem);
    }
  }

  return combined;
}

/**
 * Calculate confidence score
 */
function calculateConfidence(item, source) {
  let confidence = 0.5;

  // JSON-LD is more reliable
  if (source === 'jsonld') {
    confidence = 0.95;
  }

  // Has price increases confidence
  if (item.price) {
    confidence += 0.1;
  }

  // Has description increases confidence
  if (item.description && item.description.length > 10) {
    confidence += 0.1;
  }

  // Has section increases confidence
  if (item.section && item.section !== 'other') {
    confidence += 0.05;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Process a parse job
 */
async function processParseJob(job) {
  const { place_id, menu_id, ocr_results, structured_data } = job.data;

  console.log(`Processing parse job for menu ${menu_id}`);

  try {
    // Parse OCR results
    let ocrItems = [];
    if (ocr_results && ocr_results.text) {
      ocrItems = parseOCRText(ocr_results.text, ocr_results.sections);
    }

    // Parse JSON-LD structured data
    let jsonLdItems = [];
    if (structured_data) {
      jsonLdItems = parseJSONLD(structured_data);
    }

    // Combine results
    const items = combineResults(ocrItems, jsonLdItems);

    console.log(`Parsed ${items.length} items from menu ${menu_id}`);

    // Insert menu items into database
    const insertedItems = [];
    for (const item of items) {
      const source = jsonLdItems.some(j => j.name === item.name) ? 'jsonld' : 'ocr';
      const confidence = calculateConfidence(item, source);

      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          menu_id,
          section: item.section,
          name: item.name,
          description: item.description,
          price: item.price || null,
          currency: item.currency || 'USD',
          dietary_labels: item.dietary_labels || [],
          source_confidence: confidence,
          processed_by: process.env.WORKER_ID || 'parser-worker',
          model_version: 'parser-v1',
        })
        .select()
        .single();

      if (error) {
        console.error(`Error inserting item ${item.name}:`, error);
      } else {
        insertedItems.push(data);

        // Enqueue labeling job for this item
        await createJob('label', {
          menu_item_id: data.id,
          item_text: `${data.name}. ${data.description || ''}`,
        }, { priority: 5 });
      }
    }

    // Update menu parsing status
    await supabase
      .from('menus')
      .update({
        parsed_at: new Date().toISOString(),
        parser_version: 'parser-v1',
        confidence_score: items.length > 0
          ? items.reduce((sum, i) => sum + calculateConfidence(i, 'ocr'), 0) / items.length
          : 0,
      })
      .eq('id', menu_id);

    console.log(`Successfully parsed ${insertedItems.length} items`);

    return {
      success: true,
      items_count: insertedItems.length,
      menu_id,
    };
  } catch (error) {
    console.error('Error processing parse job:', error);
    throw error;
  }
}

// Create worker
const worker = createWorker('parse', processParseJob, {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
});

// Graceful shutdown
process.on('SIGTERM', () => gracefulShutdown(worker));
process.on('SIGINT', () => gracefulShutdown(worker));

console.log('Parser worker started');

module.exports = {
  parseOCRText,
  parseJSONLD,
  combineResults,
  parseMenuItem,
  detectSection,
  extractPrice,
};
