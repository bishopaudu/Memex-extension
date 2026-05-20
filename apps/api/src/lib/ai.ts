// ─────────────────────────────────────────────
// AI Service — Hugging Face Inference API
// Uses two models:
// - facebook/bart-large-mnli for tagging (zero-shot, always fast)
// - falconsai/text_summarization for summaries (small, fast)
// Both are free and rarely cold on HuggingFace
// ─────────────────────────────────────────────

/*const HF_API_KEY = process.env.HUGGINGFACE_API_KEY

if (!HF_API_KEY) {
  console.warn('[AI] ⚠️  HUGGINGFACE_API_KEY not set — AI features disabled')
}

// Core HuggingFace caller — handles cold starts gracefully
async function hfRequest(model: string, body: object): Promise<any> {
  if (!HF_API_KEY) return null

  try {
    const response = await fetch(
     // `https://api-inference.huggingface.co/models/${model}`,
       `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (response.status === 503) {
      console.warn(`[AI] Model ${model} is loading — skipping`)
      return null
    }

    if (!response.ok) {
      const err = await response.text()
      console.error(`[AI] ${model} error ${response.status}:`, err)
      return null
    }

    return await response.json()
  } catch (err) {
    console.error(`[AI] ${model} request failed:`, err)
    return null
  }
}

// ─────────────────────────────────────────────
// AUTO-TAGGING
// Uses zero-shot classification — we give it candidate
// tags and it scores which ones fit the content.
// This is more reliable than asking an LLM to invent tags
// because we control the vocabulary.
// ─────────────────────────────────────────────

// Candidate tags we classify against
// These cover 90% of what developers, designers, researchers save
const CANDIDATE_TAGS = [
  'javascript', 'typescript', 'react', 'nodejs', 'python',
  'css', 'design', 'ux', 'tutorial', 'documentation',
  'tool', 'productivity', 'ai', 'machine-learning', 'database',
  'devops', 'security', 'startup', 'business', 'research',
  'article', 'video', 'github', 'career', 'architecture',
  'api', 'testing', 'performance', 'open-source', 'web'
]

export async function generateTags(input: {
  url:         string
  title:       string
  description: string
}): Promise<string[]> {
  if (!HF_API_KEY) return []

  // Build a clean text input from what we have
  const text = [input.title, input.description]
    .filter(Boolean)
    .join(' ')
    .slice(0, 500) // keep it concise

  if (!text.trim()) return []

  const result = await hfRequest('facebook/bart-large-mnli', {
    inputs: text,
    parameters: {
      candidate_labels: CANDIDATE_TAGS,
      multi_label: true, // multiple tags can apply simultaneously
    },
  })

  if (!result?.labels || !result?.scores) return []

  // Take tags where the model is >35% confident
  // Tune this threshold: lower = more tags, higher = more precise
  const CONFIDENCE_THRESHOLD = 0.35

  const selectedTags = result.labels
    .map((label: string, i: number) => ({
      label,
      score: result.scores[i] as number,
    }))
    .filter((item: { label: string; score: number }) =>
      item.score > CONFIDENCE_THRESHOLD
    )
    .slice(0, 5) // max 5 tags
    .map((item: { label: string; score: number }) => item.label)

  console.log(`[AI] Tags generated: ${selectedTags.join(', ')}`)
  return selectedTags
}

// ─────────────────────────────────────────────
// SUMMARY GENERATION
// Uses a dedicated summarization model
// Much faster and more reliable than general LLMs
// ─────────────────────────────────────────────
export async function generateSummary(input: {
  url:         string
  title:       string
  description: string
}): Promise<string | null> {
  if (!HF_API_KEY) return null

  const text = [input.title, input.description]
    .filter(Boolean)
    .join('. ')
    .slice(0, 1000)

  // Need at least 50 chars to summarize meaningfully
  if (text.length < 50) return null

  const result = await hfRequest('falconsai/text_summarization', {
    inputs: text,
    parameters: {
      max_length: 80,
      min_length: 20,
    },
  })

  if (!result?.[0]?.summary_text) return null

  const summary = result[0].summary_text.trim()
  console.log(`[AI] Summary: ${summary}`)
  return summary
}

// ─────────────────────────────────────────────
// SEARCH QUERY ENHANCEMENT
// Simple keyword extraction — no LLM needed
// Removes common filler words, keeps the signal
// ─────────────────────────────────────────────
export async function enhanceSearchQuery(query: string): Promise<string> {
  // Filler words that add noise to search
  const FILLER = [
    'find', 'show', 'me', 'that', 'article', 'about',
    'the', 'a', 'an', 'i', 'saved', 'something', 'get',
    'look', 'for', 'search', 'where', 'is', 'my', 'some',
    'can', 'you', 'please', 'need', 'want', 'looking',
  ]

  const enhanced = query
    .toLowerCase()
    .split(' ')
    .filter(word => !FILLER.includes(word))
    .filter(word => word.length > 1)
    .join(' ')
    .trim()

  // If we stripped too much, use original
  const result = enhanced.length > 3 ? enhanced : query
  console.log(`[AI] Search: "${query}" → "${result}"`)
  return result
}*/


const HF_API_KEY = process.env.HUGGINGFACE_API_KEY

if (!HF_API_KEY) {
  console.warn('[AI] ⚠️ HUGGINGFACE_API_KEY not set — AI features disabled')
}

// ─────────────────────────────────────────────
// Core HuggingFace caller (FIXED ROUTER ENDPOINT)
// ─────────────────────────────────────────────
async function hfRequest(model: string, body: object): Promise<any> {
  if (!HF_API_KEY) return null

  try {
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    // Model is loading
    if (response.status === 503) {
      console.warn(`[AI] Model ${model} is loading`)
      return null
    }

    // Model not supported / moved / unavailable
    if (!response.ok) {
      const err = await response.text()
      console.error(`[AI] ${model} error ${response.status}:`, err)
      return null
    }

    return await response.json()
  } catch (err) {
    console.error(`[AI] ${model} request failed:`, err)
    return null
  }
}

// ─────────────────────────────────────────────
// MODELS (FIXED - actually available)
// ─────────────────────────────────────────────

// better zero-shot classification model (reliable on HF)
const TAG_MODEL = 'MoritzLaurer/deberta-v3-large-zeroshot-v2.0'

// stable summarization model
const SUMMARIZER_MODEL = 'sshleifer/distilbart-cnn-12-6'

// ─────────────────────────────────────────────
// TAGGING
// ─────────────────────────────────────────────
const CANDIDATE_TAGS = [
  'javascript', 'typescript', 'react', 'nodejs', 'python',
  'css', 'design', 'ux', 'tutorial', 'documentation',
  'tool', 'productivity', 'ai', 'machine-learning', 'database',
  'devops', 'security', 'startup', 'business', 'research',
  'article', 'video', 'github', 'career', 'architecture',
  'api', 'testing', 'performance', 'open-source', 'web',
]

export async function generateTags(input: {
  url: string
  title: string
  description: string
}): Promise<string[]> {
  if (!HF_API_KEY) return []

  const text = [input.title, input.description]
    .filter(Boolean)
    .join(' ')
    .slice(0, 500)

  if (!text.trim()) return []

  const result = await hfRequest(TAG_MODEL, {
    inputs: text,
    parameters: {
      candidate_labels: CANDIDATE_TAGS,
      multi_label: true,
    },
  })

  if (!result?.labels || !result?.scores) return []

  const CONFIDENCE_THRESHOLD = 0.35

  return result.labels
    .map((label: string, i: number) => ({
      label,
      score: result.scores[i],
    }))
    .filter((t: { label: string; score: number }) => t.score > CONFIDENCE_THRESHOLD)
    .slice(0, 5)
    .map((t: { label: string }) => t.label)
}

// ─────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────
export async function generateSummary(input: {
  url: string
  title: string
  description: string
}): Promise<string | null> {
  if (!HF_API_KEY) return null

  const text = [input.title, input.description]
    .filter(Boolean)
    .join('. ')
    .slice(0, 1000)

  if (text.length < 50) return null

  const result = await hfRequest(SUMMARIZER_MODEL, {
    inputs: text,
    parameters: {
      max_length: 80,
      min_length: 20,
    },
  })

  if (!result?.[0]?.summary_text) return null

  return result[0].summary_text.trim()
}

// ─────────────────────────────────────────────
// SEARCH ENHANCEMENT (UNCHANGED - already good)
// ─────────────────────────────────────────────
export async function enhanceSearchQuery(query: string): Promise<string> {
  const FILLER = [
    'find', 'show', 'me', 'that', 'article', 'about',
    'the', 'a', 'an', 'i', 'saved', 'something', 'get',
    'look', 'for', 'search', 'where', 'is', 'my', 'some',
    'can', 'you', 'please', 'need', 'want', 'looking',
  ]

  const enhanced = query
    .toLowerCase()
    .split(' ')
    .filter(word => !FILLER.includes(word))
    .filter(word => word.length > 1)
    .join(' ')
    .trim()

  return enhanced.length > 3 ? enhanced : query
}
