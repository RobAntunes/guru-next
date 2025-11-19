
import { AgentState, ShadowAction } from './happen-service'; // Self-referencing types? Best to move types to a shared file, but for now we define here or reuse.

// Redeclare locally if needed or assume they are exported from somewhere.
// Actually, I'll just use the window.api types implicitly.

export interface ShadowAction {
    id: string;
    agentId: string;
    type: 'fs:write' | 'fs:delete' | 'terminal:exec';
    summary: string;
    payload: any;
    timestamp: number;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
    metadata?: any;
}

export const happenService = {
  /**
   * List all available agents and their status
   */
  async listAgents(): Promise<AgentState[]> {
    if (!window.api?.happen?.listAgents) return [];
    const result = await window.api.happen.listAgents();
    return result.success ? result.data : [];
  },

  /**
   * Send a task to a specific agent
   */
  async sendTask(agentId: string, prompt: string, contextData: any = {}): Promise<any> {
    if (!window.api?.happen?.sendTask) throw new Error('Happen API not available');
    const result = await window.api.happen.sendTask(agentId, prompt, contextData);
    if (result.success) return result.data;
    throw new Error(result.error);
  },

  /**
   * Get pending shadow actions
   */
  async getPendingShadowActions(): Promise<ShadowAction[]> {
      if (!window.api?.happen?.getPendingShadowActions) return [];
      const result = await window.api.happen.getPendingShadowActions();
      return result.success ? result.data : [];
  },

  /**
   * Approve a shadow action
   */
  async approveShadowAction(actionId: string): Promise<boolean> {
      if (!window.api?.happen?.approveShadowAction) return false;
      const result = await window.api.happen.approveShadowAction(actionId);
      return result.success;
  },

  /**
   * Reject a shadow action
   */
  async rejectShadowAction(actionId: string): Promise<boolean> {
      if (!window.api?.happen?.rejectShadowAction) return false;
      const result = await window.api.happen.rejectShadowAction(actionId);
      return result.success;
  },

  /**
   * Enable/Disable Shadow Mode
   */
  async setShadowMode(enabled: boolean): Promise<void> {
      if (window.api?.happen?.setShadowMode) {
          await window.api.happen.setShadowMode(enabled);
      }
  },

  /**
   * Subscribe to updates
   */
  onShadowUpdate(callback: (actions: ShadowAction[]) => void): () => void {
      if (window.api?.happen?.onShadowUpdate) {
          return window.api.happen.onShadowUpdate(callback);
      }
      return () => {};
  }
};
