# Task 05: Crawler Service

## Phase
Phase 1: Crawler + OCR Workers (Weeks 3-5)

## Objective
Build the web crawler service that fetches restaurant websites and extracts menu data.

## Description
Implement a robust web crawler that respects robots.txt, extracts menu links, parses structured data (JSON-LD, Microdata), downloads menu PDFs and images, and stores artifacts to Supabase Storage.

## Core Responsibilities
1. Fetch restaurant homepage (with robots.txt compliance)
2. Extract menu links (/menu, /menu.pdf, sitemap.xml)
3. Parse structured data (schema.org/Menu, MenuItem)
4. Download PDFs and images
5. Store artifacts to Supabase Storage
6. Create crawl_runs and raw_artifacts records
7. Enqueue OCR jobs for images/PDFs

## Tasks
1. Set up crawler service (Node.js/Python)
2. Implement robots.txt checker
3. Implement HTML fetching with proper headers
4. Create menu link extraction logic
5. Implement JSON-LD/Microdata parser
6. Create PDF/image downloader
7. Integrate with Supabase Storage
8. Create crawl_run tracking
9. Implement job enqueueing for OCR
10. Add error handling and retries
11. Test with 10 diverse restaurant websites

## Implementation Details

```javascript
const crawlerPipeline = {
  fetchHomepage: async (url) => {
    // Fetch with robots.txt compliance
    // Store raw HTML + headers
  },

  extractMenuLinks: (html) => {
    // Look for: /menu, /menu.pdf, sitemap.xml
    // Parse anchor text for menu indicators
  },

  extractStructuredData: (html) => {
    // JSON-LD: schema.org/Menu, MenuItem
    // Microdata, RDFa parsing
  },

  downloadAssets: async (urls) => {
    // Download PDFs/images
    // Store to Supabase Storage
    // Return artifact references
  },

  enqueueOCR: async (artifacts) => {
    // Push to Redis queue or Supabase jobs table
  }
};
```

## Success Criteria
- [ ] Crawler service running
- [ ] Robots.txt compliance implemented
- [ ] Menu link extraction working
- [ ] Structured data parsing functional
- [ ] File downloads working
- [ ] Supabase Storage integration complete
- [ ] Crawl tracking in database
- [ ] OCR jobs enqueued properly
- [ ] Tested with 10+ diverse websites
- [ ] Error handling robust

## Dependencies
- Task 03: Worker Infrastructure
- Task 02: Database Schema

## Estimated Time
5-7 days

## Notes
- Use libraries like Cheerio (Node.js) or BeautifulSoup (Python)
- Implement rate limiting to be respectful to websites
- Handle different menu formats (HTML, PDF, images)
- Consider using Puppeteer for JavaScript-heavy sites
- Store raw HTML for debugging purposes
