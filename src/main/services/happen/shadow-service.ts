import { BrowserWindow } from 'electron';
import { writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type ShadowActionType = 'fs:write' | 'fs:delete' | 'terminal:exec';

export interface ShadowAction {
    id: string;
    agentId: string;
    type: ShadowActionType;
    summary: string;
    payload: any;
    timestamp: number;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
    metadata?: any;
}

export type ShadowCompletionHandler = (action: ShadowAction, result: any, error?: any) => void;

export class ShadowService {
    private static instance: ShadowService;
    private pendingActions: Map<string, ShadowAction> = new Map();
    private isEnabled: boolean = true; // Default to enabled for safety
    private mainWindow: BrowserWindow | null = null;
    private completionHandlers: ShadowCompletionHandler[] = [];

    private constructor() {}

    public static getInstance(): ShadowService {
        if (!ShadowService.instance) {
            ShadowService.instance = new ShadowService();
        }
        return ShadowService.instance;
    }

    public setMainWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    public setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        this.notifyUpdate();
    }

    public isShadowMode(): boolean {
        return this.isEnabled;
    }

    public onActionComplete(handler: ShadowCompletionHandler) {
        this.completionHandlers.push(handler);
    }

    /**
     * Stage an action for review.
     * Returns a pending status immediately.
     */
    public async stageAction(
        agentId: string,
        type: ShadowActionType,
        summary: string,
        payload: any,
        metadata: any = {}
    ): Promise<{ status: string; message: string; actionId: string }> {
        const id = `shadow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const action: ShadowAction = {
            id,
            agentId,
            type,
            summary,
            payload,
            timestamp: Date.now(),
            status: 'pending',
            metadata
        };

        this.pendingActions.set(id, action);
        console.log(`[ShadowService] Staged action ${id} for agent ${agentId}: ${type}`);
        
        this.notifyUpdate();

        return { 
            status: 'staged', 
            message: 'Action staged for review (Shadow Mode active)',
            actionId: id 
        };
    }

    public getPendingActions(): ShadowAction[] {
        return Array.from(this.pendingActions.values())
            .filter(a => a.status === 'pending')
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    public async approveAction(id: string, modifiedContent?: string): Promise<{ success: boolean; result?: any; error?: string }> {
        const action = this.pendingActions.get(id);
        if (!action) return { success: false, error: 'Action not found' };
        
        if (action.status !== 'pending') return { success: false, error: `Action is already ${action.status}` };

        console.log(`[ShadowService] Approving action ${id}`);
        
        // If manual correction was provided
        if (modifiedContent !== undefined && action.type === 'fs:write') {
            console.log(`[ShadowService] Applying user correction for ${id}`);
            action.payload.content = modifiedContent;
            action.metadata = { ...action.metadata, manualCorrection: true };
        }

        try {
            action.status = 'approved';
            const result = await this.executeAction(action);
            action.status = 'executed';
            
            // Update storage
            this.pendingActions.delete(id);
            this.pendingActions.set(id, action); // Keep history
            
            this.notifyUpdate();
            
            // Notify completion subscribers (e.g. HappenManager)
            this.notifyCompletion(action, result);

            return { success: true, result };
        } catch (error: any) {
            console.error(`[ShadowService] Execution failed for ${id}:`, error);
            action.status = 'failed';
            this.notifyUpdate();
            this.notifyCompletion(action, null, error.message);
            return { success: false, error: error.message };
        }
    }

    public rejectAction(id: string): { success: boolean; error?: string } {
        const action = this.pendingActions.get(id);
        if (!action) return { success: false, error: 'Action not found' };

        console.log(`[ShadowService] Rejecting action ${id}`);
        action.status = 'rejected';
        this.notifyUpdate();
        
        this.notifyCompletion(action, null, 'Action rejected by user');
        
        return { success: true };
    }

    private async executeAction(action: ShadowAction): Promise<any> {
        switch (action.type) {
            case 'fs:write':
                const { path, content } = action.payload;
                await writeFile(path, content, 'utf-8');
                return { path, bytesWritten: content.length };
            
            case 'terminal:exec':
                const { command, cwd } = action.payload;
                const { stdout, stderr } = await execAsync(command, { cwd: cwd || process.cwd() });
                return { stdout: stdout.trim(), stderr: stderr.trim() };
                
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    private notifyUpdate() {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('happen:shadow-update', this.getPendingActions());
        }
    }

    private notifyCompletion(action: ShadowAction, result: any, error?: any) {
        this.completionHandlers.forEach(h => {
            try {
                h(action, result, error);
            } catch (e) {
                console.error('[ShadowService] Error in completion handler:', e);
            }
        });
    }
}

export const shadowService = ShadowService.getInstance();
