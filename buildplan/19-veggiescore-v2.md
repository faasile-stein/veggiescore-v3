# Task 19: VeggieScore v2

## Phase
Phase 4: Embeddings & MunchMatcher (Weeks 12-14)

## Objective
Enhance the VeggieScore algorithm with weighted scoring, variety bonus, and quality indicators.

## Description
Improve the VeggieScore calculation to better reflect the vegan/vegetarian-friendliness of restaurants by considering item variety, labeling quality, and menu section distribution.

## Scoring Components

### 1. Base Score (70% weight)
- % vegan items: 100 points per %
- % vegetarian items: 50 points per %
- Maximum 100 points

### 2. Variety Bonus (15% weight)
- Number of unique vegan items
- Distribution across menu sections
- Ingredient diversity
- Maximum 10 points

### 3. Label Quality (10% weight)
- Clarity of dietary labels
- Detailed ingredient lists
- Allergen information
- Maximum 5 points

### 4. Menu Section Balance (5% weight)
- Vegan options in each section
- Not just sides/salads
- Dessert/drink options
- Maximum 5 points

## Tasks
1. Design new scoring algorithm
2. Implement variety calculation
3. Create label quality metrics
4. Build section balance logic
5. Update database function
6. Backfill scores for existing places
7. Create score history tracking
8. Add score explanation UI
9. Test with diverse restaurants
10. Validate scores manually
11. Deploy updated algorithm
12. Monitor score changes

## Implementation Details

```javascript
function computeVeggieScoreV2(menuItems) {
  const totalItems = menuItems.length;
  const veganItems = menuItems.filter(i =>
    i.dietary_labels.includes('vegan')
  );
  const vegetarianItems = menuItems.filter(i =>
    i.dietary_labels.includes('vegetarian')
  );

  // 1. Base Score (70%)
  const veganPercentage = veganItems.length / totalItems;
  const vegetarianPercentage = vegetarianItems.length / totalItems;
  const baseScore = (veganPercentage * 100 + vegetarianPercentage * 50);

  // 2. Variety Bonus (15%)
  const varietyBonus = calculateVariety(veganItems) * 10;

  // 3. Label Quality (10%)
  const labelQualityBonus = calculateLabelQuality(menuItems) * 5;

  // 4. Section Balance (5%)
  const sectionBonus = calculateSectionBalance(menuItems) * 5;

  // Total (capped at 100)
  return Math.min(100,
    baseScore * 0.7 +
    varietyBonus * 0.15 +
    labelQualityBonus * 0.1 +
    sectionBonus * 0.05
  );
}

function calculateVariety(items) {
  // Unique ingredients, diverse sections
  const sections = new Set(items.map(i => i.section));
  const ingredients = new Set(items.flatMap(i => i.ingredients));

  return Math.min(1, (sections.size / 5) * 0.5 + (ingredients.size / 20) * 0.5);
}

function calculateLabelQuality(items) {
  // Items with detailed labels
  const withLabels = items.filter(i => i.dietary_labels.length > 0);
  const withIngredients = items.filter(i => i.ingredients?.length > 0);

  return (withLabels.length / items.length) * 0.6 +
         (withIngredients.length / items.length) * 0.4;
}

function calculateSectionBalance(items) {
  const veganBySection = groupBy(
    items.filter(i => i.dietary_labels.includes('vegan')),
    'section'
  );

  // Bonus if vegan options in appetizers, mains, AND desserts
  const hasAppetizers = veganBySection['appetizers']?.length > 0;
  const hasMains = veganBySection['mains']?.length > 0;
  const hasDesserts = veganBySection['desserts']?.length > 0;

  return (hasAppetizers + hasMains + hasDesserts) / 3;
}
```

## Score Ranges & Interpretation
- **90-100**: Outstanding vegan options
- **70-89**: Great vegan choices
- **50-69**: Good vegetarian options
- **30-49**: Some plant-based items
- **0-29**: Limited options

## Success Criteria
- [ ] Algorithm designed and reviewed
- [ ] Variety calculation working
- [ ] Label quality metrics implemented
- [ ] Section balance calculated
- [ ] Database function updated
- [ ] Backfill completed
- [ ] Score history tracked
- [ ] UI shows score breakdown
- [ ] Tested with 100+ restaurants
- [ ] Manual validation passed
- [ ] Deployed to production
- [ ] Documentation updated

## Dependencies
- Task 09: Parser Service
- Task 10: AI Classifier

## Estimated Time
4-5 days

## Notes
- Document scoring methodology publicly
- Allow restaurant feedback on scores
- Consider regional variations
- Track score changes over time
- Plan for v3 improvements
