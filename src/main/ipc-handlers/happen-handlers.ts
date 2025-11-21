import { ipcMain } from 'electron';
import { happenManager } from '../services/happen/happen-manager';
import { shadowService } from '../services/happen/shadow-service';

export function registerHappenHandlers() {
    // Agent Management
    ipcMain.handle('happen:list-agents', async () => {
        try {
            const agents = happenManager.getAgents();
            return { success: true, data: agents };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('happen:send-task', async (_, { agentId, prompt, contextData }) => {
        try {
            const result = await happenManager.dispatchTask(agentId, prompt, contextData);
            return { success: true, data: result };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Shadow Mode Management
    ipcMain.handle('happen:shadow:get-pending', () => {
        try {
            const actions = shadowService.getPendingActions();
            return { success: true, data: actions };
        } catch (error: any) {
             return { success: false, error: error.message };
        }
    });

    ipcMain.handle('happen:shadow:approve', async (_, { actionId, modifiedContent }) => {
        return await shadowService.approveAction(actionId, modifiedContent);
    });

    ipcMain.handle('happen:shadow:reject', (_, { actionId }) => {
        return shadowService.rejectAction(actionId);
    });
    
    ipcMain.handle('happen:shadow:set-mode', (_, { enabled }) => {
        shadowService.setEnabled(enabled);
        return { success: true, enabled };
    });
}
