/**
 * Token Counter Component
 * Displays real-time token counts for text inputs
 */

import React, { useMemo } from 'react'
import { Badge } from './badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import {
  estimateTokens,
  estimateTokensAdvanced,
  formatTokenCount,
  calculateContextUsage,
  getTokenWarningLevel,
  estimateCost
} from '../../utils/token-counter'
import { Info, AlertCircle, AlertTriangle } from 'lucide-react'

interface TokenCounterProps {
  text: string
  maxTokens?: number
  showCost?: boolean
  model?: 'gpt-4' | 'gpt-3.5' | 'claude-opus' | 'claude-sonnet' | 'claude-haiku'
  advanced?: boolean
  className?: string
}

export function TokenCounter({
  text,
  maxTokens = 200000,
  showCost = false,
  model = 'claude-sonnet',
  advanced = false,
  className = ''
}: TokenCounterProps) {
  const tokenCount = useMemo(() => {
    return advanced ? estimateTokensAdvanced(text) : estimateTokens(text)
  }, [text, advanced])

  const warningLevel = useMemo(() => {
    return getTokenWarningLevel(tokenCount, maxTokens)
  }, [tokenCount, maxTokens])

  const contextUsage = useMemo(() => {
    return calculateContextUsage(tokenCount, maxTokens)
  }, [tokenCount, maxTokens])

  const costEstimate = useMemo(() => {
    if (!showCost) return null
    return estimateCost(tokenCount, 0, model)
  }, [tokenCount, showCost, model])

  const getVariant = () => {
    switch (warningLevel) {
      case 'safe':
        return 'default'
      case 'warning':
        return 'secondary'
      case 'critical':
        return 'destructive'
    }
  }

  const getIcon = () => {
    switch (warningLevel) {
      case 'safe':
        return <Info className="h-3 w-3" />
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />
      case 'critical':
        return <AlertCircle className="h-3 w-3" />
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={getVariant()} className={`gap-1 ${className}`}>
            {getIcon()}
            {formatTokenCount(tokenCount)} tokens
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Tokens:</span>
              <span className="font-medium">{tokenCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Context Usage:</span>
              <span className="font-medium">{contextUsage.toFixed(1)}%</span>
            </div>
            {showCost && costEstimate && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Est. Cost:</span>
                  <span className="font-medium">
                    ${(costEstimate.inputCost + costEstimate.outputCost).toFixed(4)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Model: {model}
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface InlineTokenCounterProps {
  text: string
  label?: string
  className?: string
}

export function InlineTokenCounter({ text, label = 'Tokens', className = '' }: InlineTokenCounterProps) {
  const tokenCount = useMemo(() => estimateTokens(text), [text])

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <span>{label}:</span>
      <span className="font-mono font-medium">{tokenCount.toLocaleString()}</span>
    </div>
  )
}

interface ContextWindowIndicatorProps {
  tokens: number
  maxTokens?: number
  className?: string
}

export function ContextWindowIndicator({
  tokens,
  maxTokens = 200000,
  className = ''
}: ContextWindowIndicatorProps) {
  const percentage = useMemo(() => {
    return Math.min((tokens / maxTokens) * 100, 100)
  }, [tokens, maxTokens])

  const getColor = () => {
    if (percentage < 70) return 'bg-green-500'
    if (percentage < 90) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`space-y-1 ${className}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Context Window</span>
              <span className="font-medium">{percentage.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${getColor()} transition-all duration-300`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Used:</span>
              <span className="font-medium">{tokens.toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Limit:</span>
              <span className="font-medium">{maxTokens.toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Remaining:</span>
              <span className="font-medium">{(maxTokens - tokens).toLocaleString()} tokens</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
