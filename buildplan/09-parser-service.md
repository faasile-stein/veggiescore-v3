# Task 09: Parser Service

## Phase
Phase 2: Parsing, Labeling & Admin (Weeks 6-8)

## Objective
Build the parser service to convert OCR output and structured data into structured menu items.

## Description
Implement a parser that combines JSON-LD structured data and OCR results, extracts individual menu items with names, prices, and descriptions, and stores them in the database.

## Core Responsibilities
1. Parse OCR output into menu items
2. Combine JSON-LD and OCR results
3. Extract item name, price, description
4. Handle multi-line items
5. Normalize formatting
6. Detect menu sections
7. Create menu and menu_items records
8. Enqueue labeling jobs

## Tasks
1. Set up parser service (Node.js)
2. Implement OCR result parser
3. Create JSON-LD parser
4. Build result combining logic
5. Implement item extraction
6. Create price extraction and normalization
7. Build description extraction
8. Implement section classification
9. Create database insertion logic
10. Integrate with job queue
11. Add error handling
12. Test with diverse menus

## Implementation Details

```javascript
class MenuParser {
  parseItems(ocrText, sections) {
    // Extract: item name, price, description
    // Handle multi-line items
    // Normalize formatting
  }

  combineResults(jsonLd, ocrResults) {
    // Merge structured data with OCR
    // Prefer structured data when available
    // Fill gaps with OCR results
  }

  extractPrice(text) {
    // Regex for $X.XX, €X,XX, etc.
    // Handle price ranges
    // Normalize currency
  }

  classifySection(item, context) {
    // Determine: appetizer, main, dessert, etc.
    // Use keywords and position
  }
}
```

## Parsing Strategies
1. **Structured data first** - Use JSON-LD when available
2. **OCR fallback** - Parse OCR when no structured data
3. **Hybrid approach** - Combine both sources
4. **Pattern matching** - Use regex for common patterns
5. **Context awareness** - Use surrounding text for classification

## Success Criteria
- [ ] Parser service running
- [ ] OCR parsing functional
- [ ] JSON-LD parsing working
- [ ] Result combination logic implemented
- [ ] Item extraction accurate (>85%)
- [ ] Price extraction accurate (>90%)
- [ ] Section classification working
- [ ] Database integration complete
- [ ] Label jobs enqueued
- [ ] Error handling robust
- [ ] Tested with 20+ menus

## Dependencies
- Task 06: OCR Worker
- Task 02: Database Schema

## Estimated Time
5-6 days

## Notes
- Handle various menu formats and layouts
- Store parser confidence scores
- Keep raw data for reprocessing
- Version parser logic for tracking
- Consider ML-based parsing in the future
