// AI features temporarily disabled
// HuggingFace was causing 120s timeouts on every bookmark save
// Re-enable when switching to a faster provider (DeepSeek etc)

export async function generateTags(_input: {
  url: string; title: string; description: string
}): Promise<string[]> {
  return []
}

export async function generateSummary(_input: {
  url: string; title: string; description: string
}): Promise<string> {
  return ''
}

export async function enhanceSearchQuery(query: string): Promise<string> {
  // Just return the original query — no AI enhancement
  return query
}
