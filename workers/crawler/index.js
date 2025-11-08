/**
 * Crawler Worker - Fetches restaurant websites and extracts menu data
 *
 * Responsibilities:
 * - Fetch restaurant homepage (robots.txt compliant)
 * - Extract menu links
 * - Parse structured data (JSON-LD, Microdata)
 * - Download PDFs and images
 * - Store artifacts to Supabase Storage
 * - Enqueue OCR jobs
 */

const { crawlQueue } = require('../shared/queue');
const { supabase } = require('../shared/supabase');
const axios = require('axios');
const cheerio = require('cheerio');
const robotsParser = require('robots-parser');
const crypto = require('crypto');
const { URL } = require('url');

// Process crawl jobs from the queue
crawlQueue.process(async (job) => {
  const { placeId, website } = job.data;
  console.log(`[Crawler] Processing place ${placeId}: ${website}`);

  try {
    // Create crawl run record
    const { data: crawlRun, error: crawlRunError } = await supabase
      .from('crawl_runs')
      .insert({
        place_id: placeId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (crawlRunError) throw crawlRunError;

    // Execute crawl pipeline
    const results = await crawlPipeline(website, placeId, crawlRun.id);

    // Update crawl run status
    await supabase
      .from('crawl_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        artifacts_found: results.artifacts.length,
        structured_data: results.structuredData,
      })
      .eq('id', crawlRun.id);

    console.log(`[Crawler] Completed: ${results.artifacts.length} artifacts found`);
    return results;
  } catch (error) {
    console.error(`[Crawler] Error processing ${placeId}:`, error);
    throw error;
  }
});

/**
 * Main crawl pipeline
 */
async function crawlPipeline(websiteUrl, placeId, crawlRunId) {
  const results = {
    artifacts: [],
    structuredData: null,
    menuLinks: [],
  };

  // 1. Check robots.txt
  const isAllowed = await checkRobotsTxt(websiteUrl);
  if (!isAllowed) {
    throw new Error('Crawling not allowed by robots.txt');
  }

  // 2. Fetch homepage
  const { html, headers } = await fetchPage(websiteUrl);

  // Store raw HTML
  const htmlArtifact = await storeArtifact(
    placeId,
    crawlRunId,
    'raw.html',
    Buffer.from(html),
    'text/html'
  );
  results.artifacts.push(htmlArtifact);

  // 3. Extract menu links
  const menuLinks = extractMenuLinks(html, websiteUrl);
  results.menuLinks = menuLinks;
  console.log(`[Crawler] Found ${menuLinks.length} menu links`);

  // 4. Parse structured data
  const structuredData = extractStructuredData(html);
  if (structuredData) {
    results.structuredData = structuredData;

    // Store structured data
    const jsonArtifact = await storeArtifact(
      placeId,
      crawlRunId,
      'structured-data.json',
      Buffer.from(JSON.stringify(structuredData, null, 2)),
      'application/json'
    );
    results.artifacts.push(jsonArtifact);
  }

  // 5. Download menu PDFs and images
  for (const link of menuLinks) {
    try {
      const artifact = await downloadAsset(link, placeId, crawlRunId);
      if (artifact) {
        results.artifacts.push(artifact);

        // Enqueue OCR job for images and PDFs
        if (artifact.mime_type.startsWith('image/') || artifact.mime_type === 'application/pdf') {
          await enqueueOCRJob(placeId, artifact.id, artifact.storage_path);
        }
      }
    } catch (error) {
      console.error(`[Crawler] Failed to download ${link}:`, error.message);
    }
  }

  return results;
}

/**
 * Check robots.txt compliance
 */
async function checkRobotsTxt(websiteUrl) {
  try {
    const url = new URL(websiteUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;

    const response = await axios.get(robotsUrl, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });

    if (response.status === 404) {
      // No robots.txt, allow crawling
      return true;
    }

    const robots = robotsParser(robotsUrl, response.data);
    const userAgent = 'VeggieScoreBot/1.0';
    return robots.isAllowed(websiteUrl, userAgent);
  } catch (error) {
    console.warn(`[Crawler] robots.txt check failed:`, error.message);
    // On error, be conservative and allow
    return true;
  }
}

/**
 * Fetch web page
 */
async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'VeggieScoreBot/1.0 (+https://veggiescore.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml',
    },
    maxRedirects: 5,
  });

  return {
    html: response.data,
    headers: response.headers,
  };
}

/**
 * Extract menu links from HTML
 */
function extractMenuLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const menuLinks = new Set();

  // Look for links with menu-related keywords
  const menuKeywords = ['menu', 'our-menu', 'food', 'carte', 'speisekarte'];

  $('a').each((i, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().toLowerCase();

    if (!href) return;

    // Check if link text or href contains menu keywords
    const hasMenuKeyword = menuKeywords.some(keyword =>
      text.includes(keyword) || href.toLowerCase().includes(keyword)
    );

    if (hasMenuKeyword) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        menuLinks.add(absoluteUrl);
      } catch (error) {
        // Invalid URL, skip
      }
    }
  });

  // Also look for direct PDF/image links
  $('a[href$=".pdf"], a[href*="menu"][href$=".jpg"], a[href*="menu"][href$=".png"]').each((i, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        menuLinks.add(absoluteUrl);
      } catch (error) {
        // Invalid URL, skip
      }
    }
  });

  return Array.from(menuLinks);
}

/**
 * Extract structured data (JSON-LD, Microdata)
 */
function extractStructuredData(html) {
  const $ = cheerio.load(html);
  const structuredData = {
    jsonLd: [],
    microdata: [],
  };

  // Extract JSON-LD
  $('script[type="application/ld+json"]').each((i, elem) => {
    try {
      const data = JSON.parse($(elem).html());

      // Look for Menu or MenuItem schema
      if (data['@type'] === 'Menu' || data['@type'] === 'MenuItem' ||
          (Array.isArray(data) && data.some(item => item['@type'] === 'Menu' || item['@type'] === 'MenuItem'))) {
        structuredData.jsonLd.push(data);
      }
    } catch (error) {
      console.warn('[Crawler] Failed to parse JSON-LD:', error.message);
    }
  });

  // Extract Microdata (simplified)
  $('[itemtype*="schema.org/Menu"], [itemtype*="schema.org/MenuItem"]').each((i, elem) => {
    const item = {
      type: $(elem).attr('itemtype'),
      properties: {},
    };

    $(elem).find('[itemprop]').each((j, prop) => {
      const name = $(prop).attr('itemprop');
      const content = $(prop).attr('content') || $(prop).text().trim();
      item.properties[name] = content;
    });

    structuredData.microdata.push(item);
  });

  return structuredData.jsonLd.length > 0 || structuredData.microdata.length > 0
    ? structuredData
    : null;
}

/**
 * Download asset (PDF, image)
 */
async function downloadAsset(url, placeId, crawlRunId) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'VeggieScoreBot/1.0 (+https://veggiescore.com)',
      },
    });

    const buffer = Buffer.from(response.data);
    const mimeType = response.headers['content-type'] || 'application/octet-stream';

    // Determine file extension
    const urlPath = new URL(url).pathname;
    const ext = urlPath.split('.').pop() || 'bin';
    const filename = `${Date.now()}-menu.${ext}`;

    return await storeArtifact(placeId, crawlRunId, filename, buffer, mimeType);
  } catch (error) {
    console.error(`[Crawler] Download failed for ${url}:`, error.message);
    return null;
  }
}

/**
 * Store artifact to Supabase Storage and database
 */
async function storeArtifact(placeId, crawlRunId, filename, buffer, mimeType) {
  // Create hash for deduplication
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Check if artifact already exists
  const { data: existing } = await supabase
    .from('raw_artifacts')
    .select('id, storage_path')
    .eq('content_hash', hash)
    .single();

  if (existing) {
    console.log(`[Crawler] Artifact already exists: ${hash.substring(0, 8)}`);
    return existing;
  }

  // Upload to storage
  const storagePath = `${placeId}/${crawlRunId}/${filename}`;
  const { error: uploadError } = await supabase.storage
    .from('artifacts')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[Crawler] Storage upload failed:', uploadError);
    throw uploadError;
  }

  // Create database record
  const { data: artifact, error: dbError } = await supabase
    .from('raw_artifacts')
    .insert({
      crawl_run_id: crawlRunId,
      storage_path: storagePath,
      mime_type: mimeType,
      file_size: buffer.length,
      content_hash: hash,
    })
    .select()
    .single();

  if (dbError) throw dbError;

  console.log(`[Crawler] Stored artifact: ${storagePath}`);
  return artifact;
}

/**
 * Enqueue OCR job for processing
 */
async function enqueueOCRJob(placeId, artifactId, storagePath) {
  const { error } = await supabase
    .from('jobs')
    .insert({
      type: 'ocr',
      status: 'pending',
      payload: {
        place_id: placeId,
        artifact_id: artifactId,
        storage_path: storagePath,
      },
    });

  if (error) {
    console.error('[Crawler] Failed to enqueue OCR job:', error);
    throw error;
  }

  console.log(`[Crawler] Enqueued OCR job for artifact ${artifactId}`);
}

console.log('[Crawler] Worker started, waiting for jobs...');
