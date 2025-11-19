import { aiManager } from './ai-manager';
import { lanceDBManager } from '../storage/lancedb-manager';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ModelConfig {
    providerId: string;
    modelId: string;
}

export class ChatOrchestrator {

    /**
     * Process a user message with the provided context graph
     */
    async processMessage(
        message: string,
        agentId: string,
        contextGraph: any,
        modelConfig: ModelConfig = { providerId: 'local', modelId: 'gpt2' }
    ): Promise<string> {

        console.log(`[ChatOrchestrator] Processing message for agent ${agentId} using ${modelConfig.modelId}`);

        // 1. Serialize the graph into a compact prompt representation
        const graphContext = this.serializeGraph(contextGraph);

        // 2. Construct the System Prompt based on Agent Persona
        const systemPrompt = this.getSystemPrompt(agentId);

        // 3. Build the full prompt
        const fullPrompt = `
${systemPrompt}

[CURRENT CONTEXT GRAPH]
${JSON.stringify(graphContext, null, 2)}

[USER REQUEST]
${message}

[RESPONSE]
`.trim();

        console.log('[ChatOrchestrator] Sending prompt to AI Manager...');

        try {
            // 4. Invoke LLM via AI Manager
            const responseText = await aiManager.generateText(fullPrompt, modelConfig.providerId, modelConfig.modelId, {
                maxTokens: 1024, // Increased for better models
                temperature: 0.7
            });

            // 5. Save interaction to Memory (LanceDB)
            // We fire-and-forget this to not block the response
            this.saveInteraction(message, responseText, agentId).catch(console.error);

            return responseText;

        } catch (error: any) {
            console.error('[ChatOrchestrator] Error generating response:', error);
            return `Error: ${error.message}`;
        }
    }

    /**
     * Convert the raw graph into a token-efficient JSON structure
     */
    private serializeGraph(rawGraph: any): any {
        if (!rawGraph || !rawGraph.nodes) return { nodes: [], edges: [] };

        // Filter for only active nodes to save tokens
        const activeNodes = rawGraph.nodes
            .filter((n: any) => n.active)
            .map((n: any) => ({
                id: n.id,
                type: n.type,
                label: n.label,
                // Include minimal metadata if useful
                category: n.category
            }));

        // Filter edges that connect active nodes
        const activeNodeIds = new Set(activeNodes.map((n: any) => n.id));
        const relevantEdges = rawGraph.edges
            .filter((e: any) => activeNodeIds.has(e.source) && activeNodeIds.has(e.target))
            .map((e: any) => ({
                source: e.source,
                target: e.target,
                type: e.type
            }));

        return {
            nodes: activeNodes,
            edges: relevantEdges
        };
    }

    /**
     * Get the persona definition for the agent
     */
    private getSystemPrompt(agentId: string): string {
        const basePrompt = "You are an advanced AI assistant within the Guru AI Mission Control.";

        switch (agentId) {
            case 'ARCHITECT-01':
                return `${basePrompt} You are the System Architect. Focus on high-level structure, patterns, and system design. Analyze the Context Graph for architectural dependencies.`;
            case 'CODER-ALPHA':
                return `${basePrompt} You are the Lead Developer. Focus on code implementation, refactoring, and syntax. You are precise and technical.`;
            case 'QA-BOT':
                return `${basePrompt} You are the QA Engineer. Focus on testing, verification, and finding potential bugs or edge cases.`;
            default:
                return `${basePrompt} You are a helpful assistant.`;
        }
    }

    /**
     * Save the interaction to long-term memory
     */
    private async saveInteraction(userMsg: string, agentMsg: string, agentId: string) {
        await lanceDBManager.addMemory({
            text: `User: ${userMsg}\nAgent (${agentId}): ${agentMsg}`,
            type: 'interaction',
            tags: ['chat', agentId],
            metadata: {
                agentId,
                timestamp: Date.now()
            }
        });
    }
}

export const chatOrchestrator = new ChatOrchestrator();
