/**
 * Analytics Service using PostHog
 * Tracks feature usage, user retention, and engagement metrics
 */

import posthog from 'posthog-js'

interface AnalyticsConfig {
  apiKey: string
  apiHost?: string
  enabled?: boolean
}

class AnalyticsService {
  private initialized = false
  private enabled = false

  /**
   * Initialize PostHog analytics
   */
  initialize(config: AnalyticsConfig) {
    if (this.initialized) return

    this.enabled = config.enabled !== false

    if (!this.enabled) {
      console.log('[Analytics] Disabled')
      return
    }

    posthog.init(config.apiKey, {
      api_host: config.apiHost || 'https://app.posthog.com',
      autocapture: false, // Disable automatic event capture for privacy
      capture_pageview: false, // We'll manually track page views
      disable_session_recording: true, // Disable session recording for privacy
      persistence: 'localStorage',
      defaults: '2025-05-24',
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          posthog.debug()
          console.log('[Analytics] Debug mode enabled - check browser console for events')
        }
      }
    })

    this.initialized = true
    console.log('[Analytics] Initialized with key:', config.apiKey.substring(0, 10) + '...')
    console.log('[Analytics] Host:', config.apiHost || 'https://app.posthog.com')
  }

  /**
   * Identify user (call once per session)
   */
  identify(userId: string, properties?: Record<string, any>) {
    if (!this.enabled) return
    posthog.identify(userId, properties)
  }

  /**
   * Track a custom event
   */
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.enabled) return
    posthog.capture(eventName, properties)
  }

  /**
   * Track page view
   */
  trackPageView(pageName: string, properties?: Record<string, any>) {
    if (!this.enabled) return
    posthog.capture('$pageview', {
      $current_url: pageName,
      ...properties
    })
  }

  // ========================================
  // Feature-specific tracking methods
  // ========================================

  /**
   * Track knowledge base actions
   */
  trackKnowledgeBase(action: 'created' | 'opened' | 'deleted' | 'updated', kbId: string, metadata?: Record<string, any>) {
    this.track('knowledge_base', {
      action,
      kb_id: kbId,
      ...metadata
    })
  }

  /**
   * Track document actions
   */
  trackDocument(action: 'uploaded' | 'viewed' | 'deleted' | 'searched', documentId: string, metadata?: Record<string, any>) {
    this.track('document', {
      action,
      document_id: documentId,
      ...metadata
    })
  }

  /**
   * Track spec actions
   */
  trackSpec(action: 'created' | 'viewed' | 'edited' | 'deleted' | 'applied', specId: string, metadata?: Record<string, any>) {
    this.track('spec', {
      action,
      spec_id: specId,
      ...metadata
    })
  }

  /**
   * Track prompt actions
   */
  trackPrompt(action: 'created' | 'used' | 'edited' | 'deleted', promptId: string, metadata?: Record<string, any>) {
    this.track('prompt', {
      action,
      prompt_id: promptId,
      ...metadata
    })
  }

  /**
   * Track memory actions
   */
  trackMemory(action: 'viewed' | 'searched' | 'added' | 'dismissed', metadata?: Record<string, any>) {
    this.track('memory', {
      action,
      ...metadata
    })
  }

  /**
   * Track symbol graph actions
   */
  trackSymbolGraph(action: 'opened' | 'analyzed' | 'filtered' | 'exported', metadata?: Record<string, any>) {
    this.track('symbol_graph', {
      action,
      ...metadata
    })
  }

  /**
   * Track context operations
   */
  trackContext(action: 'copied' | 'exported' | 'synthesized', metadata?: Record<string, any>) {
    this.track('context', {
      action,
      ...metadata
    })
  }

  /**
   * Track search queries
   */
  trackSearch(query: string, resultCount: number, source: string) {
    this.track('search', {
      query,
      result_count: resultCount,
      source
    })
  }

  /**
   * Track tool usage
   */
  trackTool(toolName: string, action: 'used' | 'configured', metadata?: Record<string, any>) {
    this.track('tool', {
      tool_name: toolName,
      action,
      ...metadata
    })
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: string) {
    this.track('error', {
      error_message: error.message,
      error_stack: error.stack,
      context
    })
  }

  /**
   * Track session start
   */
  trackSessionStart() {
    this.track('session_start', {
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track session end
   */
  trackSessionEnd(duration: number) {
    this.track('session_end', {
      duration_seconds: duration,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Reset analytics (for testing or logout)
   */
  reset() {
    if (!this.enabled) return
    posthog.reset()
  }
}

export const analytics = new AnalyticsService()