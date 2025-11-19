/**
 * Conversation State Service
 * Manages token-efficient conversation state graphs
 */

import type { ConversationState } from '../../../../shared/types/state';

class ConversationStateService {
  private state: ConversationState = {
    goal: '',
    constraints: [],
    facts: [],
    history: []
  };

  /**
   * Initialize with goal
   */
  setGoal(goal: string): void {
    this.state.goal = goal;
  }

  /**
   * Add constraint from spec
   */
  addConstraint(label: string, value: string, source: 'spec' | 'manual' = 'manual'): void {
    const id = `constraint_${Date.now()}_${Math.random()}`;
    this.state.constraints.push({
      id,
      label,
      value,
      active: true,
      source
    });
  }

  /**
   * Toggle constraint
   */
  toggleConstraint(id: string, active: boolean): void {
    const constraint = this.state.constraints.find(c => c.id === id);
    if (constraint) {
      constraint.active = active;
    }
  }

  /**
   * Add fact learned during execution
   */
  addFact(label: string, value: any, confidence: number = 1.0): void {
    const id = `fact_${Date.now()}_${Math.random()}`;

    // Check if fact already exists, update instead
    const existing = this.state.facts.find(f => f.label === label);
    if (existing) {
      existing.value = value;
      existing.confidence = Math.max(existing.confidence, confidence);
    } else {
      this.state.facts.push({
        id,
        label,
        value,
        confidence
      });
    }
  }

  /**
   * Add history entry
   */
  addHistoryEntry(action: string, result: 'success' | 'failure', summary: string): void {
    this.state.history.push({
      action,
      result,
      summary,
      timestamp: new Date()
    });

    // Keep only last 10 history entries for token efficiency
    if (this.state.history.length > 10) {
      this.state.history = this.state.history.slice(-10);
    }
  }

  /**
   * Get current state
   */
  getState(): ConversationState {
    return { ...this.state };
  }

  /**
   * Export state as context for AI
   */
  exportAsContext(): string {
    const parts: string[] = [];

    // Goal
    if (this.state.goal) {
      parts.push(`## Goal\n${this.state.goal}`);
    }

    // Active constraints
    const activeConstraints = this.state.constraints.filter(c => c.active);
    if (activeConstraints.length > 0) {
      parts.push('\n## Constraints');
      activeConstraints.forEach(c => {
        const source = c.source === 'spec' ? ' (from spec)' : '';
        parts.push(`- ${c.label}: ${c.value}${source}`);
      });
    }

    // High-confidence facts
    const relevantFacts = this.state.facts.filter(f => f.confidence > 0.7);
    if (relevantFacts.length > 0) {
      parts.push('\n## Known Facts');
      relevantFacts.forEach(f => {
        parts.push(`- ${f.label}: ${JSON.stringify(f.value)}`);
      });
    }

    // Recent history
    if (this.state.history.length > 0) {
      parts.push('\n## Recent Actions');
      this.state.history.slice(-5).forEach(h => {
        const status = h.result === 'success' ? '✓' : '✗';
        parts.push(`- ${status} ${h.action}: ${h.summary}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Clear state
   */
  clear(): void {
    this.state = {
      goal: '',
      constraints: [],
      facts: [],
      history: []
    };
  }

  /**
   * Load state from saved data
   */
  loadState(state: ConversationState): void {
    this.state = { ...state };
  }

  /**
   * Calculate token estimate for current state
   */
  estimateTokens(): number {
    const context = this.exportAsContext();
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(context.length / 4);
  }
}

export const conversationState = new ConversationStateService();
