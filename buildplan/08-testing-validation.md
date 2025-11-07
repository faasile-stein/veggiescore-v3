# Task 08: Testing & Validation

## Phase
Phase 1: Crawler + OCR Workers (Weeks 3-5)

## Objective
Test the complete crawling and OCR pipeline with diverse restaurant websites and validate accuracy.

## Description
Comprehensive testing of the crawler and OCR workers with 10 diverse restaurants to ensure accuracy, measure performance, and tune preprocessing parameters.

## Test Restaurant Selection Criteria
1. Different website types (custom, WordPress, Wix, Squarespace)
2. Various menu formats (PDF, HTML, images)
3. Different cuisines and languages
4. Complex layouts (multi-column, artistic designs)
5. Simple layouts (plain text menus)

## Tasks
1. Select 10 diverse test restaurants
2. Run complete pipeline for each restaurant
3. Measure OCR accuracy manually
4. Validate extracted data quality
5. Test error handling scenarios
6. Measure processing times
7. Identify common failure patterns
8. Tune OCR preprocessing parameters
9. Optimize worker performance
10. Document findings and improvements
11. Create benchmark dataset
12. Set up automated testing

## Metrics to Track
- **OCR Accuracy**: % of correctly extracted text
- **Price Extraction**: % of correctly identified prices
- **Section Detection**: % of correctly identified sections
- **Processing Time**: Average time per menu
- **Success Rate**: % of successful crawls
- **Storage Usage**: Average storage per restaurant

## Success Criteria
- [ ] 10 test restaurants processed
- [ ] OCR accuracy > 85%
- [ ] Price extraction accuracy > 90%
- [ ] Section detection accuracy > 80%
- [ ] All restaurants fully processed
- [ ] Common issues documented
- [ ] Parameters optimized
- [ ] Performance baseline established
- [ ] Automated tests created
- [ ] Benchmark dataset saved

## Test Cases
1. **Simple PDF menu** - Single column, clear text
2. **Complex PDF menu** - Multi-column, images
3. **Image-based menu** - Photo of physical menu
4. **HTML structured menu** - With schema.org markup
5. **JavaScript-rendered menu** - Requires rendering
6. **Multi-page PDF** - Multiple pages
7. **Low-quality image** - Blurry or dark photo
8. **Artistic menu** - Unusual fonts/layouts
9. **Multi-language menu** - Multiple languages
10. **Menu with prices** - Various price formats

## Dependencies
- Task 05: Crawler Service
- Task 06: OCR Worker
- Task 07: Storage Integration

## Estimated Time
4-5 days

## Notes
- Keep test results for future comparison
- Document edge cases and limitations
- Create issue tickets for identified bugs
- Consider A/B testing different OCR approaches
- Build test suite for regression testing
