# Task 10: AI Classifier

## Phase
Phase 2: Parsing, Labeling & Admin (Weeks 6-8)

## Objective
Implement AI-powered dietary label classification for menu items.

## Description
Build a classifier that uses rule-based logic and LLM fallback to classify menu items with dietary labels (vegan, vegetarian, gluten-free, dairy-free, etc.) with confidence scores.

## Dietary Labels to Classify
- `vegan` - No animal products
- `vegetarian` - No meat/fish
- `gluten-free` - No gluten
- `dairy-free` - No dairy
- `nut-free` - No nuts
- `soy-free` - No soy
- `pescatarian` - Fish but no meat
- `halal` - Halal certified
- `kosher` - Kosher certified

## Classification Approach

### 1. Rule-Based (Fast & Free)
- Keyword matching
- Ingredient analysis
- Explicit label detection

### 2. LLM Fallback (Accurate but Costs)
- Use when confidence < 80%
- OpenAI GPT-4 or similar
- Batch requests for efficiency

## Tasks
1. Create classifier service (Python/Node.js)
2. Implement rule-based classifier
3. Build keyword dictionaries
4. Integrate LLM API (OpenAI)
5. Create batching logic for LLM requests
6. Implement confidence scoring
7. Create label validation logic
8. Store results with confidence scores
9. Track model version and provenance
10. Test classification accuracy
11. Optimize for cost and speed

## Implementation Details

```python
def classify_dietary_labels(item_text: str) -> dict:
    labels = []
    confidence_scores = {}

    # Rule-based first
    if any(word in item_text.lower() for word in ['vegan', 'plant-based']):
        labels.append('vegan')
        confidence_scores['vegan'] = 0.95

    # If low confidence, use LLM
    if max(confidence_scores.values(), default=0) < 0.8:
        llm_result = classify_with_llm(item_text)
        labels = llm_result['labels']
        confidence_scores = llm_result['confidence']

    return {
        'labels': labels,
        'confidence': confidence_scores,
        'method': 'rule-based' or 'llm'
    }
```

## Cost Optimization
- Use rule-based for obvious cases
- Batch LLM requests (up to 20 items)
- Cache common items/ingredients
- Use smaller models when possible
- Track API costs

## Success Criteria
- [ ] Classifier service running
- [ ] Rule-based classifier functional
- [ ] Keyword dictionaries comprehensive
- [ ] LLM integration working
- [ ] Batching implemented
- [ ] Confidence scoring accurate
- [ ] Classification accuracy > 90%
- [ ] Cost per menu < $0.10
- [ ] Results stored with provenance
- [ ] Model version tracked
- [ ] Tested with 100+ items

## Dependencies
- Task 09: Parser Service
- Task 02: Database Schema

## Estimated Time
6-7 days

## Notes
- Consider using open-source models (Llama, etc.)
- Track false positives/negatives
- Build feedback loop for improvement
- Store prompts for reproducibility
- Monitor API costs carefully
