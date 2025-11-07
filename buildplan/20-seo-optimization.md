# Task 20: SEO Optimization

## Phase
Phase 4: Embeddings & MunchMatcher (Weeks 12-14)

## Objective
Optimize website for search engines to drive organic traffic to restaurant pages.

## Description
Implement comprehensive SEO best practices including static page generation, structured data, meta tags, sitemaps, and performance optimization to achieve a Lighthouse score >90.

## Core SEO Elements

### 1. Static Pages (ISR/SSG)
- Generate static pages for top restaurants
- Use Incremental Static Regeneration
- Pre-render search result pages
- Optimize build times

### 2. Structured Data (JSON-LD)
- Restaurant schema
- Menu schema
- LocalBusiness schema
- Review schema
- BreadcrumbList schema

### 3. Meta Tags
- Dynamic title tags
- Meta descriptions
- Open Graph tags
- Twitter Card tags
- Canonical URLs

### 4. Sitemaps
- Main sitemap
- Restaurant sitemap (dynamic)
- Image sitemap
- Auto-update on new content

### 5. Performance
- Image optimization (WebP)
- Code splitting
- Lazy loading
- Edge caching

## Tasks
1. Set up Next.js SSG/ISR for place pages
2. Implement structured data generation
3. Create dynamic meta tag system
4. Build sitemap generation
5. Optimize images (Next Image)
6. Implement code splitting
7. Set up edge caching (Cloudflare/Vercel)
8. Add lazy loading
9. Optimize Core Web Vitals
10. Create robots.txt
11. Submit to Google Search Console
12. Run Lighthouse audits
13. Fix identified issues

## Implementation Details

### Structured Data Example
```typescript
function generateRestaurantSchema(place: Place, menuItems: MenuItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": place.name,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": place.address
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": place.location.lat,
      "longitude": place.location.lng
    },
    "menu": {
      "@type": "Menu",
      "hasMenuItem": menuItems.map(item => ({
        "@type": "MenuItem",
        "name": item.name,
        "description": item.description,
        "offers": {
          "@type": "Offer",
          "price": item.price,
          "priceCurrency": item.currency
        }
      }))
    },
    "servesCuisine": place.cuisine_types,
    "priceRange": "$".repeat(place.price_level)
  };
}
```

### Meta Tags
```typescript
export function generateMetadata({ params }: Props): Metadata {
  const place = await getPlace(params.id);

  return {
    title: `${place.name} - VeggieScore ${place.veggie_score}/100`,
    description: `Find vegan & vegetarian options at ${place.name}. VeggieScore: ${place.veggie_score}/100. ${place.cuisine_types.join(', ')}.`,
    openGraph: {
      title: place.name,
      description: `VeggieScore: ${place.veggie_score}/100`,
      images: [place.image_url],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: place.name,
      description: `VeggieScore: ${place.veggie_score}/100`
    }
  };
}
```

## Target Keywords
- "[City] vegan restaurants"
- "[City] vegetarian restaurants"
- "[Restaurant name] vegan menu"
- "[Restaurant name] vegetarian options"
- "plant-based dining [city]"

## Success Criteria
- [ ] Static pages generated for top 1000 restaurants
- [ ] Structured data on all pages
- [ ] Dynamic meta tags working
- [ ] Sitemap generated and submitted
- [ ] Images optimized (WebP)
- [ ] Code splitting implemented
- [ ] Edge caching configured
- [ ] Lazy loading working
- [ ] Lighthouse Performance >90
- [ ] Lighthouse SEO >90
- [ ] Lighthouse Accessibility >90
- [ ] Core Web Vitals passing
- [ ] Indexed in Google Search Console

## Dependencies
- Task 02: Database Schema
- Phase 0-3 completion (need content)

## Estimated Time
5-6 days

## Notes
- Focus on local SEO
- Target long-tail keywords
- Build backlinks from vegan/vegetarian sites
- Monitor search rankings
- Update content regularly
- Consider multi-language support
