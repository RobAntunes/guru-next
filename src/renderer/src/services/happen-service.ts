import { ShadowAction } from './happen-service'; // Types are defined here

export interface AgentState {
    id: string;
    name: string;
    role: string;
    status: 'idle' | 'active' | 'paused' | 'error' | 'waiting_approval';
    currentTask?: string;
    tools: string[];
    waitingFor?: string;
    budget?: {
        used: number;
        limit: number;
    };
}

export type { ShadowAction };

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
   * Approve a shadow action.
   * @param actionId The ID of the action to approve.
   * @param modifiedContent (Optional) If the user edited the content in the Correction Deck, pass it here.
   */
  async approveShadowAction(actionId: string, modifiedContent?: string): Promise<boolean> {
      if (!window.api?.happen?.approveShadowAction) return false;
      const result = await window.api.happen.approveShadowAction(actionId, modifiedContent);
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
  },

  /**
   * Read file content for the diff view.
   */
  async readFile(path: string): Promise<string> {
      if (window.api?.fs?.readFile) {
          return await window.api.fs.readFile(path);
      }
      console.warn("window.api.fs.readFile not available");
      return ""; 
  }
};
