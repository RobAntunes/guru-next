import { ChatMessage } from '../types/control-room';
import { contextGraphService } from './context-graph-service';

class ChatService {

    /**
     * Send a message to an agent, including the current context graph
     */
    async sendMessage(text: string, agentId: string, modelConfig?: { providerId: string, modelId: string }): Promise<ChatMessage> {
        // 1. Get current graph snapshot
        const graphData = contextGraphService.getGraphData();

        // 2. Send to backend via IPC
        // @ts-ignore - window.api is exposed via preload
        const result = await window.api.chat.send(text, agentId, graphData, modelConfig);

        if (!result.success) {
            throw new Error(result.error || 'Failed to send message');
        }

        // 3. Return the response as a ChatMessage
        // Handle both string (legacy) and object (enhanced) responses
        const responseText = typeof result.data === 'string'
            ? result.data
            : result.data.response || JSON.stringify(result.data);

        return {
            id: Date.now().toString(),
            agentId: agentId,
            text: responseText,
            timestamp: Date.now(),
            type: 'text'
        };
    }

    /**
     * Send a message with streaming updates
     */
    async sendStreamMessage(
        text: string,
        agentId: string,
        modelConfig: { providerId: string, modelId: string },
        onUpdate: (update: any) => void,
        conversationId?: string
    ): Promise<void> {
        // 1. Get current graph snapshot
        const graphData = contextGraphService.getGraphData();

        // 2. Setup listener
        // @ts-ignore
        const removeListener = window.api.chat.onStreamUpdate(onUpdate);

        try {
            // 3. Send to backend via IPC
            // @ts-ignore
            const result = await window.api.chat.sendStream(text, agentId, graphData, modelConfig, conversationId);

            if (!result.success) {
                throw new Error(result.error || 'Failed to send message');
            }
        } finally {
            // 4. Cleanup listener
            if (removeListener) {
                removeListener();
            }
        }
    }
}

export const chatService = new ChatService();
