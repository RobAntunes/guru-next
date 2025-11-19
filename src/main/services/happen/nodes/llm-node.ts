import { BaseServiceNode } from '../base-node';
import { aiModelService } from '../../../ai-model-service';

export class LLMNode extends BaseServiceNode {
    constructor(node: any) {
        super(node, 'LLMNode');
    }

    protected initialize(): void {
        // Generate Text
        this.registerHandler('llm:generate', async (event: any) => {
            const { prompt, options } = event;
            if (!prompt) throw new Error('Prompt is required');

            const result = await aiModelService.generateText(prompt, options);
            return { success: true, ...result };
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
