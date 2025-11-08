/**
 * Labeler Service
 * Classifies menu items with dietary labels using rule-based + LLM fallback
 */

const { createWorker, gracefulShutdown } = require('../shared/queue');
const { supabase, markJobCompleted, markJobFailed } = require('../shared/supabase');
const OpenAI = require('openai');

// Initialize OpenAI client (optional, for fallback)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Rule-based classification keywords
const KEYWORD_RULES = {
  vegan: {
    positive: [
      'vegan', 'plant-based', 'plant based', 'no animal products',
      'dairy-free and egg-free', 'fully plant', 'v (vegan)', '(v)',
    ],
    negative: [
      'cheese', 'dairy', 'milk', 'cream', 'butter', 'egg', 'eggs',
      'meat', 'chicken', 'beef', 'pork', 'fish', 'seafood', 'honey',
      'bacon', 'sausage', 'gelatin', 'whey', 'yogurt',
    ],
  },
  vegetarian: {
    positive: [
      'vegetarian', 'veggie', 'meatless', 'no meat',
      'veg', 'v (vegetarian)',
    ],
    negative: [
      'meat', 'chicken', 'beef', 'pork', 'fish', 'seafood',
      'bacon', 'sausage', 'ham', 'lamb', 'turkey',
      'anchov', 'gelatin',
    ],
  },
  'gluten-free': {
    positive: [
      'gluten-free', 'gluten free', 'gf', 'no gluten',
      'celiac friendly', 'celiac-friendly',
    ],
    negative: [
      'wheat', 'bread', 'pasta', 'flour', 'barley',
      'rye', 'couscous', 'seitan', 'gluten',
    ],
  },
  'dairy-free': {
    positive: [
      'dairy-free', 'dairy free', 'df', 'no dairy',
      'lactose-free', 'lactose free', 'non-dairy',
    ],
    negative: [
      'cheese', 'milk', 'cream', 'butter', 'yogurt',
      'whey', 'casein', 'lactose', 'dairy',
    ],
  },
  'nut-free': {
    positive: [
      'nut-free', 'nut free', 'nf', 'no nuts',
      'tree nut free',
    ],
    negative: [
      'almond', 'walnut', 'pecan', 'cashew', 'pistachio',
      'hazelnut', 'macadamia', 'peanut', 'nuts',
    ],
  },
};

/**
 * Rule-based classification
 */
function classifyWithRules(itemText) {
  const text = itemText.toLowerCase();
  const labels = [];
  const confidence = {};

  for (const [label, rules] of Object.entries(KEYWORD_RULES)) {
    let score = 0.5; // Neutral start

    // Check positive keywords
    for (const keyword of rules.positive) {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.3;
        break; // One positive keyword is enough
      }
    }

    // Check negative keywords
    for (const keyword of rules.negative) {
      if (text.includes(keyword.toLowerCase())) {
        score -= 0.5;
        break; // One negative keyword disqualifies
      }
    }

    // Add label if confidence is high enough
    if (score >= 0.7) {
      labels.push(label);
      confidence[label] = Math.min(score, 0.95);
    }
  }

  // Calculate overall confidence
  const avgConfidence = labels.length > 0
    ? Object.values(confidence).reduce((a, b) => a + b, 0) / labels.length
    : 0.5;

  return {
    labels,
    confidence,
    method: 'rule-based',
    overall_confidence: avgConfidence,
  };
}

/**
 * LLM-based classification (fallback for low confidence)
 */
async function classifyWithLLM(itemText) {
  if (!openai) {
    console.warn('OpenAI API key not configured, skipping LLM classification');
    return null;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a dietary label classifier for restaurant menu items.
Classify the menu item with one or more of these labels: vegan, vegetarian, gluten-free, dairy-free, nut-free.

Rules:
- vegan: No animal products (no meat, dairy, eggs, honey)
- vegetarian: No meat or fish (but may contain dairy/eggs)
- gluten-free: No wheat, barley, rye, or gluten
- dairy-free: No milk, cheese, cream, butter, yogurt
- nut-free: No tree nuts or peanuts

Return ONLY a JSON object with:
{
  "labels": ["label1", "label2"],
  "confidence": {"label1": 0.95, "label2": 0.85},
  "reasoning": "brief explanation"
}`,
        },
        {
          role: 'user',
          content: `Classify this menu item:\n\n${itemText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const response = completion.choices[0].message.content;
    const parsed = JSON.parse(response);

    return {
      labels: parsed.labels || [],
      confidence: parsed.confidence || {},
      method: 'llm',
      overall_confidence: parsed.labels.length > 0
        ? Object.values(parsed.confidence).reduce((a, b) => a + b, 0) / parsed.labels.length
        : 0.5,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('Error in LLM classification:', error);
    return null;
  }
}

/**
 * Batch LLM classification for efficiency
 */
async function classifyBatchWithLLM(items) {
  if (!openai) {
    console.warn('OpenAI API key not configured, skipping LLM classification');
    return items.map(() => null);
  }

  try {
    const itemsText = items
      .map((item, i) => `${i + 1}. ${item}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Classify multiple menu items with dietary labels.
Return a JSON array where each element corresponds to one menu item with:
{
  "labels": ["label1"],
  "confidence": {"label1": 0.95}
}`,
        },
        {
          role: 'user',
          content: `Classify these menu items:\n\n${itemsText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content;
    const parsed = JSON.parse(response);

    return parsed.map((result, i) => ({
      labels: result.labels || [],
      confidence: result.confidence || {},
      method: 'llm-batch',
      overall_confidence: result.labels.length > 0
        ? Object.values(result.confidence).reduce((a, b) => a + b, 0) / result.labels.length
        : 0.5,
    }));
  } catch (error) {
    console.error('Error in batch LLM classification:', error);
    return items.map(() => null);
  }
}

/**
 * Classify a menu item
 */
async function classifyMenuItem(itemText) {
  // Try rule-based first
  const ruleResult = classifyWithRules(itemText);

  // If confidence is high enough, use rule-based result
  if (ruleResult.overall_confidence >= 0.8) {
    return ruleResult;
  }

  // Otherwise, try LLM for better accuracy
  const llmResult = await classifyWithLLM(itemText);
  if (llmResult && llmResult.overall_confidence > ruleResult.overall_confidence) {
    return llmResult;
  }

  // Fall back to rule-based if LLM fails or has lower confidence
  return ruleResult;
}

/**
 * Process a label job
 */
async function processLabelJob(job) {
  const { menu_item_id, item_text } = job.data;

  console.log(`Processing label job for item ${menu_item_id}`);

  try {
    // Classify the item
    const classification = await classifyMenuItem(item_text);

    console.log(`Classified item ${menu_item_id}:`, classification);

    // Update menu item with labels
    const { error } = await supabase
      .from('menu_items')
      .update({
        dietary_labels: classification.labels,
        source_confidence: classification.overall_confidence,
        model_version: classification.method,
        metadata: {
          classification_confidence: classification.confidence,
          classification_method: classification.method,
          reasoning: classification.reasoning,
        },
      })
      .eq('id', menu_item_id);

    if (error) {
      throw new Error(`Failed to update menu item: ${error.message}`);
    }

    // After labeling, update place VeggieScore
    const { data: item } = await supabase
      .from('menu_items')
      .select('menu_id, menus(place_id)')
      .eq('id', menu_item_id)
      .single();

    if (item && item.menus) {
      // Call compute_veggie_score function
      await supabase.rpc('compute_veggie_score', {
        p_place_id: item.menus.place_id,
      });
    }

    return {
      success: true,
      menu_item_id,
      labels: classification.labels,
      confidence: classification.overall_confidence,
    };
  } catch (error) {
    console.error('Error processing label job:', error);
    throw error;
  }
}

// Create worker
const worker = createWorker('label', processLabelJob, {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'),
});

// Graceful shutdown
process.on('SIGTERM', () => gracefulShutdown(worker));
process.on('SIGINT', () => gracefulShutdown(worker));

console.log('Labeler worker started');

module.exports = {
  classifyWithRules,
  classifyWithLLM,
  classifyMenuItem,
  classifyBatchWithLLM,
};
