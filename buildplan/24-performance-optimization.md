# Task 24: Performance Optimization

## Phase
Phase 5: Hardening, Scaling & Polish (Weeks 15-16)

## Objective
Optimize application performance across database, API, frontend, and infrastructure layers.

## Description
Comprehensive performance tuning to achieve p95 latency <500ms, optimize database queries, implement caching strategies, and improve frontend load times.

## Optimization Areas

### 1. Database Optimization
- Query optimization
- Index tuning
- Connection pooling
- Query result caching

### 2. API Optimization
- Response caching
- Compression (gzip/brotli)
- Rate limiting
- CDN integration

### 3. Frontend Optimization
- Code splitting
- Image optimization
- Lazy loading
- Bundle size reduction

### 4. Infrastructure
- Edge caching
- Geographic distribution
- Load balancing

## Tasks

### Database
1. Analyze slow queries (pg_stat_statements)
2. Add missing indexes
3. Optimize complex joins
4. Implement query result caching
5. Set up connection pooling (PgBouncer)
6. Configure vacuum and analyze
7. Consider read replicas

### API
8. Implement Redis caching layer
9. Add response compression
10. Set up CDN (Cloudflare/Fastly)
11. Optimize Edge Functions
12. Implement request batching
13. Add cache headers

### Frontend
14. Implement code splitting
15. Optimize images (WebP, lazy loading)
16. Reduce bundle size
17. Enable compression
18. Implement service worker
19. Optimize Core Web Vitals

### Infrastructure
20. Configure edge caching
21. Set up geographic load balancing
22. Optimize worker startup time
23. Implement connection keep-alive

## Implementation Details

### Database Caching
```javascript
// Cache menu data for 30 days
const CACHE_TTL = 30 * 24 * 60 * 60;

async function getMenu(menuId) {
  // Check Redis cache
  const cached = await redis.get(`menu:${menuId}`);
  if (cached) return JSON.parse(cached);

  // Fetch from DB
  const menu = await supabase
    .from('menus')
    .select('*, menu_items(*)')
    .eq('id', menuId)
    .single();

  // Cache result
  await redis.setex(`menu:${menuId}`, CACHE_TTL, JSON.stringify(menu));

  return menu;
}
```

### Query Optimization
```sql
-- Before: Slow query
SELECT * FROM places
WHERE ST_DWithin(location, user_location, 5000)
ORDER BY veggie_score DESC;

-- After: Optimized with index
CREATE INDEX idx_places_location_score ON places
USING GIST(location)
WHERE veggie_score > 50;
```

### Image Optimization
```typescript
// Next.js Image component
import Image from 'next/image';

<Image
  src={place.image_url}
  alt={place.name}
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
  formats={['image/webp', 'image/avif']}
/>
```

### Edge Caching
```javascript
// Cloudflare Worker
export default {
  async fetch(request, env) {
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      response = await fetch(request);
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 'public, max-age=3600');
      await cache.put(request, response.clone());
    }

    return response;
  }
};
```

## Performance Targets

### API Latency
- p50: <100ms
- p95: <500ms
- p99: <1000ms

### Database Queries
- Simple queries: <50ms
- Complex queries: <200ms
- Vector search: <100ms

### Frontend
- First Contentful Paint: <1.8s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1
- Time to Interactive: <3.8s

### Worker Processing
- OCR job: <30s
- Parse job: <5s
- Crawl job: <60s

## Success Criteria
- [ ] Slow queries identified and optimized
- [ ] All indexes created
- [ ] Query caching implemented
- [ ] Connection pooling configured
- [ ] Redis caching layer deployed
- [ ] CDN configured
- [ ] Response compression enabled
- [ ] Code splitting implemented
- [ ] Images optimized
- [ ] Bundle size reduced by 30%
- [ ] Edge caching working
- [ ] p95 latency <500ms
- [ ] Lighthouse score >90
- [ ] Core Web Vitals passing

## Monitoring
- Track performance metrics in Grafana
- Set up performance budgets
- Alert on degradation
- Regular performance audits

## Dependencies
- Task 22: Monitoring
- All previous tasks

## Estimated Time
6-7 days

## Notes
- Use real production data for testing
- Profile before optimizing
- Document all optimizations
- Monitor impact on costs
- Create performance runbook
- Plan regular optimization cycles
