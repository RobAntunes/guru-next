import { BaseServiceNode } from '../base-node';
import { aiManager } from '../../ai-manager';
import { aiModelService } from '../../../ai-model-service';

export class LLMNode extends BaseServiceNode {
    constructor(node: any) {
        super(node, 'LLMNode');
    }

    protected initialize(): void {
        // Generate Text (Chat Completion)
        this.registerHandler('llm:generate', async (event: any) => {
            const { messages, tools, config } = event;

            if (!messages || !Array.isArray(messages)) {
                // Fallback for legacy calls (if any)
                if (event.prompt) {
                    const modelId = 'gemini-3-pro-preview';
                    const providerId = aiManager.getProviderForModel(modelId);
                    const result = await aiManager.generateText(event.prompt, providerId, modelId);
                    return { success: true, content: result };
                }
                throw new Error('Messages array is required');
            }

            const modelId = config?.model || 'gemini-3-pro-preview';
            const providerId = aiManager.getProviderForModel(modelId);

            try {
                const result = await aiManager.generateWithTools(
                    messages,
                    providerId,
                    modelId,
                    tools || []
                );

                return {
                    success: true,
                    content: result.content,
                    tool_calls: result.tool_calls
                };
            } catch (error: any) {
                console.error('[LLMNode] Generation failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Generate Text (Chat Completion) - Streaming
        // Note: Since registerHandler expects Promise<any>, we handle streaming differently
        // The caller needs to use node.on() directly for streaming, or we emit chunks as events
        this.node.on('llm:generate:stream', async (event, context) => {
            try {
                console.log(`[${this.name}] Handling llm:generate:stream`);
                const { messages, tools, config } = event.payload || event;

                if (!messages || !Array.isArray(messages)) {
                    throw new Error('Messages array is required for streaming');
                }

                const modelId = config?.model || 'gemini-3-pro-preview';
                const providerId = aiManager.getProviderForModel(modelId);

                // Return an async generator for streaming
                const generator = aiManager.generateWithToolsStream(
                    messages,
                    providerId,
                    modelId,
                    tools || []
                );

                // For happen-core, we return the generator itself
                // The Event Continuum will handle it appropriately
                return generator;
            } catch (error: any) {
                console.error('[LLMNode] Streaming generation failed:', error);
                return { success: false, error: error.message };
            }
        });

        // Generate Embedding
        this.registerHandler('llm:embed', async (event: any) => {
            const { text } = event;
            if (!text) throw new Error('Text is required');

            const result = await aiModelService.generateEmbedding(text);
            return { success: true, embedding: result };
        });
    }
}
