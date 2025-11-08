/**
 * CDN and Edge Caching Configuration for VeggieScore
 *
 * Supports:
 * - Cloudflare Workers
 * - Vercel Edge Functions
 * - Generic CDN headers
 */

// Cache control headers for different resource types
const CACHE_HEADERS = {
  // Static assets
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable',  // 1 year
    'CDN-Cache-Control': 'public, max-age=31536000',
  },

  // Images
  images: {
    'Cache-Control': 'public, max-age=2592000',  // 30 days
    'CDN-Cache-Control': 'public, max-age=2592000',
  },

  // API responses (frequently changing)
  api: {
    'Cache-Control': 'public, max-age=300, s-maxage=600',  // 5min client, 10min CDN
    'CDN-Cache-Control': 'public, max-age=600',
    'Vary': 'Accept-Encoding, Authorization',
  },

  // Search results (moderate caching)
  search: {
    'Cache-Control': 'public, max-age=60, s-maxage=300',  // 1min client, 5min CDN
    'CDN-Cache-Control': 'public, max-age=300',
    'Vary': 'Accept-Encoding',
  },

  // User-specific (no caching)
  private: {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },

  // Leaderboards (short cache)
  leaderboard: {
    'Cache-Control': 'public, max-age=60, s-maxage=300',  // 1min client, 5min CDN
    'CDN-Cache-Control': 'public, max-age=300',
  },

  // Menus (long cache)
  menu: {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',  // 1hr client, 1day CDN
    'CDN-Cache-Control': 'public, max-age=86400',
  },
};

/**
 * Get cache headers for resource type
 */
function getCacheHeaders(type = 'api') {
  return CACHE_HEADERS[type] || CACHE_HEADERS.api;
}

/**
 * Cloudflare Worker for edge caching
 */
const cloudflareWorker = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const cache = caches.default;

  // Cache key (include query params for search, exclude for static)
  const cacheKey = new Request(url.toString(), request);

  // Try cache first
  let response = await cache.match(cacheKey);

  if (!response) {
    // Fetch from origin
    response = await fetch(request);

    // Clone response for caching
    response = new Response(response.body, response);

    // Add cache headers based on path
    if (url.pathname.startsWith('/api/search')) {
      response.headers.set('Cache-Control', 'public, max-age=300');
    } else if (url.pathname.startsWith('/api/menu')) {
      response.headers.set('Cache-Control', 'public, max-age=86400');
    } else if (url.pathname.startsWith('/api/leaderboard')) {
      response.headers.set('Cache-Control', 'public, max-age=300');
    } else if (url.pathname.startsWith('/static')) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // Cache successful responses
    if (response.ok) {
      await cache.put(cacheKey, response.clone());
    }
  }

  return response;
}
`;

/**
 * Vercel Edge Config
 */
const vercelEdgeConfig = {
  routes: [
    {
      src: '/api/search.*',
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    },
    {
      src: '/api/menu/.*',
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    },
    {
      src: '/api/leaderboard.*',
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    },
    {
      src: '/static/.*',
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  ],
};

/**
 * Express middleware for cache headers
 */
function cacheMiddleware(type = 'api') {
  return (req, res, next) => {
    const headers = getCacheHeaders(type);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    next();
  };
}

/**
 * Conditional caching based on response
 */
function conditionalCache(req, res, next) {
  const originalSend = res.send;

  res.send = function (data) {
    // Determine cache type based on URL
    let cacheType = 'api';

    if (req.path.includes('/search')) {
      cacheType = 'search';
    } else if (req.path.includes('/menu')) {
      cacheType = 'menu';
    } else if (req.path.includes('/leaderboard')) {
      cacheType = 'leaderboard';
    } else if (req.headers.authorization) {
      cacheType = 'private';  // User-specific
    }

    // Set headers
    const headers = getCacheHeaders(cacheType);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Add ETag for conditional requests
    if (cacheType !== 'private') {
      const etag = require('crypto')
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');
      res.setHeader('ETag', `"${etag}"`);

      // Handle If-None-Match
      if (req.headers['if-none-match'] === `"${etag}"`) {
        return res.status(304).end();
      }
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Purge CDN cache (for Cloudflare)
 */
async function purgeCDNCache(urls, options = {}) {
  const {
    zoneId = process.env.CLOUDFLARE_ZONE_ID,
    apiToken = process.env.CLOUDFLARE_API_TOKEN,
  } = options;

  if (!zoneId || !apiToken) {
    console.warn('[CDN] Cloudflare credentials not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('[CDN] Purge error:', error);
    return false;
  }
}

/**
 * Invalidate cache for a place
 */
async function invalidatePlaceCache(placeId) {
  const urls = [
    `https://veggiescore.com/api/place/${placeId}`,
    `https://veggiescore.com/api/menu/${placeId}`,
  ];

  return purgeCDNCache(urls);
}

/**
 * Invalidate search cache
 */
async function invalidateSearchCache() {
  const urls = [
    'https://veggiescore.com/api/search*',
    'https://veggiescore.com/api/places*',
  ];

  return purgeCDNCache(urls);
}

module.exports = {
  CACHE_HEADERS,
  getCacheHeaders,
  cacheMiddleware,
  conditionalCache,
  purgeCDNCache,
  invalidatePlaceCache,
  invalidateSearchCache,
  cloudflareWorker,
  vercelEdgeConfig,
};
