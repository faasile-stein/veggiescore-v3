# Task 23: A/B Testing Framework

## Phase
Phase 5: Hardening, Scaling & Polish (Weeks 15-16)

## Objective
Implement A/B testing framework to measure and optimize feature effectiveness.

## Description
Build infrastructure for running controlled experiments on features, UI variants, and algorithms to make data-driven product decisions.

## Core Components

### 1. Experiment Configuration
- Define experiments
- Set variants
- Define success metrics
- Set traffic allocation

### 2. User Assignment
- Consistent hashing for user → variant
- Track assignments
- Prevent variant switching

### 3. Event Tracking
- Track key actions
- Measure conversion rates
- Calculate statistical significance

### 4. Analysis Dashboard
- Experiment results
- Statistical significance
- Confidence intervals
- Recommendation engine

## Experiments to Implement

### 1. VeggieScore Display
- **Control**: Score shown in small badge
- **Treatment**: Score prominently displayed in card
- **Metric**: Click-through rate to place details

### 2. Quest Notification
- **Control**: In-app notification only
- **Treatment**: Push notification
- **Metric**: Quest completion rate

### 3. Search Results Order
- **Control**: Distance-based ranking
- **Treatment**: Score + distance hybrid
- **Metric**: Search → discovery conversion

### 4. Upload Points
- **Control**: 50 points per upload
- **Treatment A**: 75 points
- **Treatment B**: 100 points
- **Metric**: Upload frequency

## Tasks
1. Design experiment framework
2. Create experiment configuration system
3. Implement user assignment logic
4. Build event tracking
5. Create experiment table schema
6. Implement variant rendering
7. Build analysis queries
8. Create experiment dashboard
9. Implement statistical tests
10. Test experiment framework
11. Document experiment process
12. Launch first experiment

## Implementation Details

### Experiment Configuration
```javascript
const experiments = {
  veggie_score_prominence: {
    name: 'VeggieScore Prominence',
    variants: {
      control: { showInCard: false },
      treatment: { showInCard: true }
    },
    metrics: ['place_detail_clicks', 'time_on_page'],
    allocation: { control: 50, treatment: 50 }
  }
};
```

### User Assignment
```javascript
function getVariant(userId, experimentId) {
  const experiment = experiments[experimentId];

  // Consistent hash
  const hash = murmurhash(userId + experimentId);
  const bucket = hash % 100;

  // Allocate to variant
  let cumulativePercent = 0;
  for (const [variant, percent] of Object.entries(experiment.allocation)) {
    cumulativePercent += percent;
    if (bucket < cumulativePercent) {
      // Track assignment
      trackAssignment(userId, experimentId, variant);
      return variant;
    }
  }
}
```

### Event Tracking
```javascript
function trackExperimentEvent(userId, experimentId, eventName, metadata) {
  const variant = getUserVariant(userId, experimentId);

  supabase.from('experiment_events').insert({
    user_id: userId,
    experiment_id: experimentId,
    variant: variant,
    event_name: eventName,
    metadata: metadata,
    created_at: new Date().toISOString()
  });
}
```

### Statistical Analysis
```sql
-- Calculate conversion rates
SELECT
  variant,
  COUNT(DISTINCT user_id) as users,
  COUNT(DISTINCT CASE WHEN event_name = 'place_detail_click' THEN user_id END) as conversions,
  COUNT(DISTINCT CASE WHEN event_name = 'place_detail_click' THEN user_id END)::FLOAT /
    COUNT(DISTINCT user_id) as conversion_rate
FROM experiment_events
WHERE experiment_id = 'veggie_score_prominence'
GROUP BY variant;
```

## Success Criteria
- [ ] Framework designed
- [ ] Configuration system built
- [ ] User assignment working
- [ ] Event tracking functional
- [ ] Database schema created
- [ ] Variant rendering implemented
- [ ] Analysis queries working
- [ ] Dashboard created
- [ ] Statistical tests implemented
- [ ] Framework tested
- [ ] Documentation complete
- [ ] First experiment launched

## Key Metrics
- **Sample Size**: Users per variant
- **Conversion Rate**: % completing goal action
- **Statistical Significance**: p-value < 0.05
- **Confidence Interval**: 95% CI
- **Effect Size**: Relative improvement

## Dependencies
- Task 22: Monitoring
- Task 14: Mobile App

## Estimated Time
4-5 days

## Notes
- Run experiments for minimum 1 week
- Need ~1000 users per variant for significance
- Consider seasonality effects
- Document all experiment results
- Plan experiment roadmap
- Avoid experiment collision
