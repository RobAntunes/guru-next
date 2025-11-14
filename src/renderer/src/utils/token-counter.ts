/**
 * Token Counter Utility
 * Provides token counting functionality for various text inputs
 */

/**
 * Rough token estimation using character count
 * More accurate methods would use tiktoken or similar
 * Rule of thumb: ~4 characters = 1 token for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // Basic estimation: 4 chars ≈ 1 token
  const charCount = text.length
  const tokenEstimate = Math.ceil(charCount / 4)

  return tokenEstimate
}

/**
 * More sophisticated token estimation
 * Takes into account word boundaries and common patterns
 */
export function estimateTokensAdvanced(text: string): number {
  if (!text) return 0

  // Split by whitespace and punctuation
  const words = text.split(/[\s\n]+/).filter(Boolean)

  let tokenCount = 0

  for (const word of words) {
    // Short words (1-4 chars) are typically 1 token
    if (word.length <= 4) {
      tokenCount += 1
    }
    // Medium words (5-8 chars) are typically 1-2 tokens
    else if (word.length <= 8) {
      tokenCount += Math.ceil(word.length / 5)
    }
    // Longer words are roughly 1 token per 3-4 characters
    else {
      tokenCount += Math.ceil(word.length / 3.5)
    }
  }

  // Add tokens for special characters and punctuation
  const specialChars = text.match(/[.,!?;:()[\]{}'"<>]/g) || []
  tokenCount += specialChars.length * 0.5

  return Math.ceil(tokenCount)
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString()
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`
  } else {
    return `${(count / 1000000).toFixed(1)}M`
  }
}

/**
 * Calculate cost estimation based on token count
 * Prices are approximate and should be updated based on actual API pricing
 */
export interface TokenCostEstimate {
  tokens: number
  inputCost: number
  outputCost: number
  currency: string
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number = 0,
  model: 'gpt-4' | 'gpt-3.5' | 'claude-opus' | 'claude-sonnet' | 'claude-haiku' = 'claude-sonnet'
): TokenCostEstimate {
  // Pricing per 1M tokens (approximate as of 2024)
  const pricing = {
    'gpt-4': { input: 30, output: 60 },
    'gpt-3.5': { input: 0.5, output: 1.5 },
    'claude-opus': { input: 15, output: 75 },
    'claude-sonnet': { input: 3, output: 15 },
    'claude-haiku': { input: 0.25, output: 1.25 }
  }

  const modelPricing = pricing[model]
  const inputCost = (inputTokens / 1000000) * modelPricing.input
  const outputCost = (outputTokens / 1000000) * modelPricing.output

  return {
    tokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    currency: 'USD'
  }
}

/**
 * Calculate percentage of context window used
 */
export function calculateContextUsage(
  tokens: number,
  maxContextWindow: number = 200000 // Default to Claude's 200K context
): number {
  return Math.min((tokens / maxContextWindow) * 100, 100)
}

/**
 * Get warning level based on token count
 */
export function getTokenWarningLevel(
  tokens: number,
  maxContextWindow: number = 200000
): 'safe' | 'warning' | 'critical' {
  const percentage = calculateContextUsage(tokens, maxContextWindow)

  if (percentage < 70) return 'safe'
  if (percentage < 90) return 'warning'
  return 'critical'
}
