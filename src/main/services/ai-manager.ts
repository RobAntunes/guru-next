import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';


export interface AIModel {
    id: string;
    name: string;
    providerId: string;
    description?: string;
    contextWindow?: number;
}

export interface AIProvider {
    id: string;
    name: string;
    models: AIModel[];
    configure(apiKey: string): void;
    generateText(prompt: string, modelId: string, options?: any): Promise<string>;
    generateWithTools?(messages: any[], modelId: string, tools: any[], options?: any): Promise<{ content: string; tool_calls?: any[] }>;
    generateWithToolsStream?(messages: any[], modelId: string, tools: any[], options?: any): AsyncGenerator<{ content?: string; tool_calls?: any[] }>;
    isConfigured(): boolean;
}

export class OpenAIProvider implements AIProvider {
    id = 'openai';
    name = 'OpenAI';
    private client: OpenAI | null = null;

    models: AIModel[] = [
        { id: 'gpt-5.1', name: 'GPT-5.1', providerId: 'openai', description: 'Latest flagship model, excellent for reasoning and coding.', contextWindow: 128000 },
        { id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai', description: 'Versatile, high-intelligence model.', contextWindow: 128000 },
        { id: 'o3-mini', name: 'o3-mini', providerId: 'openai', description: 'Cost-effective reasoning model.', contextWindow: 128000 }
    ];

    configure(apiKey: string) {
        this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateText(prompt: string, modelId: string, options?: any): Promise<string> {
        if (!this.client) throw new Error('OpenAI not configured');

        const completion = await this.client.chat.completions.create({
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens
        });

        return completion.choices[0].message.content || '';
    }

    async generateWithTools(messages: any[], modelId: string, tools: any[], options?: any): Promise<{ content: string; tool_calls?: any[] }> {
        if (!this.client) throw new Error('OpenAI not configured');

        const completion = await this.client.chat.completions.create({
            model: modelId,
            messages: messages.map(m => this.mapMessageToOpenAI(m)),
            tools: tools,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens
        });

        const message = completion.choices[0].message;
        return {
            content: message.content || '',
            tool_calls: message.tool_calls
        };
    }

    private mapMessageToOpenAI(msg: any): any {
        // 1. Handle System Messages
        if (msg.role === 'system') {
            return { role: 'system', content: msg.content };
        }

        // 2. Handle User Messages
        if (msg.role === 'user') {
            return { role: 'user', content: msg.content };
        }

        // 3. Handle Assistant Messages
        if (msg.role === 'assistant') {
            const mapped: any = { role: 'assistant' };
            if (msg.content) mapped.content = msg.content;
            if (msg.tool_calls) {
                mapped.tool_calls = msg.tool_calls.map((tc: any) => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.function?.name || tc.name,
                        arguments: typeof tc.function?.arguments === 'string'
                            ? tc.function.arguments
                            : JSON.stringify(tc.function?.arguments || tc.args || {})
                    }
                }));
            }
            return mapped;
        }

        // 4. Handle Tool Results
        if (msg.role === 'tool') {
            return {
                role: 'tool',
                tool_call_id: msg.tool_call_id,
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            };
        }

        return msg;
    }
}

export class AnthropicProvider implements AIProvider {
    id = 'anthropic';
    name = 'Anthropic';
    private client: Anthropic | null = null;

    models: AIModel[] = [
        { id: 'claude-4.5-sonnet', name: 'Claude 4.5 Sonnet', providerId: 'anthropic', description: 'Most capable model for coding and complex tasks.', contextWindow: 200000 },
        { id: 'claude-4.5-haiku', name: 'Claude 4.5 Haiku', providerId: 'anthropic', description: 'Fast and efficient.', contextWindow: 200000 }
    ];

    configure(apiKey: string) {
        this.client = new Anthropic({ apiKey });
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateText(prompt: string, modelId: string, options?: any): Promise<string> {
        if (!this.client) throw new Error('Anthropic not configured');

        const message = await this.client.messages.create({
            model: modelId,
            max_tokens: options?.maxTokens || 1024,
            messages: [{ role: 'user', content: prompt }],
            temperature: options?.temperature || 0.7
        });

        // @ts-ignore
        return message.content[0].text;
    }

    async generateWithTools(messages: any[], modelId: string, tools: any[], options?: any): Promise<{ content: string; tool_calls?: any[] }> {
        if (!this.client) throw new Error('Anthropic not configured');

        // Extract system message if present in messages
        let systemPrompt = options?.system;
        const systemMsg = messages.find((m: any) => m.role === 'system');
        if (systemMsg) {
            systemPrompt = systemMsg.content;
        }

        // Map messages to Anthropic format
        const anthropicMessages = messages
            .filter((m: any) => m.role !== 'system')
            .map((m: any) => {
                if (m.role === 'tool') {
                    return {
                        role: 'user',
                        content: [{
                            type: 'tool_result',
                            tool_use_id: m.tool_call_id,
                            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                        }]
                    };
                }
                if (m.role === 'assistant' && m.tool_calls) {
                    return {
                        role: 'assistant',
                        content: [
                            ...(m.content ? [{ type: 'text', text: m.content }] : []),
                            ...m.tool_calls.map((tc: any) => ({
                                type: 'tool_use',
                                id: tc.id,
                                name: tc.function.name,
                                input: typeof tc.function.arguments === 'string'
                                    ? JSON.parse(tc.function.arguments)
                                    : tc.function.arguments
                            }))
                        ]
                    };
                }
                // Ensure content is string for simple messages
                if (typeof m.content !== 'string' && !Array.isArray(m.content)) {
                    return { ...m, content: JSON.stringify(m.content) };
                }
                return m;
            });

        const response = await this.client.messages.create({
            model: modelId,
            max_tokens: options?.maxTokens || 4096,
            messages: anthropicMessages,
            tools: tools,
            temperature: options?.temperature || 0.7,
            system: systemPrompt
        });

        const textContent = response.content.find(c => c.type === 'text');
        const toolCalls = response.content.filter(c => c.type === 'tool_use');

        return {
            content: textContent && textContent.type === 'text' ? textContent.text : '',
            tool_calls: toolCalls.map(tc => ({
                id: tc.id,
                type: 'function',
                function: {
                    name: tc.name,
                    arguments: JSON.stringify(tc.input)
                }
            }))
        };
    }
}

export class GeminiProvider implements AIProvider {
    id = 'gemini';
    name = 'Google Gemini';
    private client: GoogleGenerativeAI | null = null;

    models: AIModel[] = [
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', providerId: 'gemini', description: 'Google\'s most intelligent model.', contextWindow: 2000000 },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', providerId: 'gemini', description: 'Legacy, ex-flagship model.', contextWindow: 1000000 },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerId: 'gemini', description: 'Fast and efficient.', contextWindow: 1000000 }
    ];

    configure(apiKey: string) {
        this.client = new GoogleGenerativeAI(apiKey);
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateText(prompt: string, modelId: string, options?: any): Promise<string> {
        if (!this.client) throw new Error('Gemini not configured');

        console.log(`[GeminiProvider] generateText called with modelId: ${modelId}, prompt length: ${prompt.length}`);
        const model = this.client.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log(`[GeminiProvider] Response text length: ${text.length}`);
        return text;
    }

    async generateWithTools(messages: any[], modelId: string, tools: any[], options?: any): Promise<{ content: string; tool_calls?: any[] }> {
        if (!this.client) throw new Error('Gemini not configured');

        const model = this.client.getGenerativeModel({ model: modelId });

        // Filter out system messages - we'll prepend system context to first user message instead
        const nonSystemMessages = messages.filter((m: any) => m.role !== 'system');

        // Extract system instruction if present
        const systemMsg = messages.find((m: any) => m.role === 'system');
        const systemContext = systemMsg ? systemMsg.content + '\n\n' : '';

        // Map messages to Gemini format
        const history = nonSystemMessages.slice(0, -1).map((m: any) => this.mapMessageToGemini(m));

        const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
        const lastContent = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

        // Prepend system context to the first user message if this is the first turn
        const prompt = history.length === 0 ? systemContext + lastContent : lastContent;

        const chat = model.startChat({
            history: history,
            tools: tools as any
        });

        const result = await chat.sendMessage(prompt);
        const response = await result.response;

        const text = response.text();
        const functionCalls = response.functionCalls();

        let tool_calls: any[] | undefined;
        if (functionCalls && functionCalls.length > 0) {
            tool_calls = functionCalls.map((fc: any) => ({
                id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate ID as Gemini doesn't provide one
                type: 'function',
                function: {
                    name: fc.name,
                    arguments: JSON.stringify(fc.args)
                }
            }));
        }

        return {
            content: text,
            tool_calls
        };
    }

    async *generateWithToolsStream(messages: any[], modelId: string, tools: any[], options?: any): AsyncGenerator<{ content?: string; tool_calls?: any[] }> {
        if (!this.client) throw new Error('Gemini not configured');

        const model = this.client.getGenerativeModel({ model: modelId });

        // Filter out system messages - we'll prepend system context to first user message instead
        const nonSystemMessages = messages.filter((m: any) => m.role !== 'system');

        // Extract system instruction if present
        const systemMsg = messages.find((m: any) => m.role === 'system');
        const systemContext = systemMsg ? systemMsg.content + '\n\n' : '';

        // Map messages to Gemini format
        const history = nonSystemMessages.slice(0, -1).map((m: any) => this.mapMessageToGemini(m));

        const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
        const lastContent = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

        // Prepend system context to the first user message if this is the first turn
        const prompt = history.length === 0 ? systemContext + lastContent : lastContent;

        const chat = model.startChat({
            history: history,
            tools: tools as any
        });

        const result = await chat.sendMessageStream(prompt);

        let accumulatedText = '';

        for await (const chunk of result.stream) {
            try {
                const text = chunk.text();
                if (text) {
                    accumulatedText += text;
                    yield { content: accumulatedText };
                }
            } catch (e) {
                // Ignore errors from chunk.text() if it's not a text chunk (e.g. function call)
            }
        }

        const response = await result.response;
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const tool_calls = functionCalls.map((fc: any) => ({
                id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'function',
                function: {
                    name: fc.name,
                    arguments: JSON.stringify(fc.args)
                }
            }));
            yield { tool_calls };
        }
    }

    private mapMessageToGemini(msg: any): any {
        // 1. Handle System Messages (filtered out of history, used as systemInstruction)
        if (msg.role === 'system') {
            return { role: 'user', parts: [{ text: `[System Instruction]: ${msg.content}` }] };
        }

        // 2. Handle User Messages
        if (msg.role === 'user') {
            return {
                role: 'user',
                parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
            };
        }

        // 3. Handle Assistant Messages
        if (msg.role === 'assistant') {
            const parts: any[] = [];

            if (msg.content) {
                parts.push({ text: msg.content });
            }

            if (msg.tool_calls) {
                msg.tool_calls.forEach((tc: any) => {
                    parts.push({
                        functionCall: {
                            name: tc.function.name,
                            args: typeof tc.function.arguments === 'string'
                                ? JSON.parse(tc.function.arguments)
                                : tc.function.arguments
                        }
                    });
                });
            }

            return { role: 'model', parts };
        }

        // 4. Handle Tool Results
        if (msg.role === 'tool') {
            return {
                role: 'function',
                parts: [{
                    functionResponse: {
                        name: msg.name,
                        response: {
                            name: msg.name,
                            content: typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content
                        }
                    }
                }]
            };
        }

        // Default fallback
        return {
            role: 'user',
            parts: [{ text: JSON.stringify(msg) }]
        };
    }
}



class AIProviderManager {
    private providers: Map<string, AIProvider> = new Map();
    private apiKeys: Record<string, string> = {};

    constructor() {
        this.registerProvider(new OpenAIProvider());
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new GeminiProvider());
    }

    registerProvider(provider: AIProvider) {
        this.providers.set(provider.id, provider);
    }

    getProvider(id: string): AIProvider | undefined {
        return this.providers.get(id);
    }

    getAllProviders(): AIProvider[] {
        return Array.from(this.providers.values());
    }

    setApiKey(providerId: string, key: string) {
        this.apiKeys[providerId] = key;
        const provider = this.providers.get(providerId);
        if (provider) {
            provider.configure(key);
        }
    }

    getApiKey(providerId: string): string | undefined {
        return this.apiKeys[providerId];
    }

    async generateText(prompt: string, providerId: string, modelId: string, options?: any): Promise<string> {
        const provider = this.providers.get(providerId);
        if (!provider) throw new Error(`Provider ${providerId} not found`);

        if (!provider.isConfigured()) {
            throw new Error(`Provider ${provider.name} is not configured. Please add an API Key in Settings.`);
        }

        return provider.generateText(prompt, modelId, options);
    }

    async generateWithTools(messages: any[], providerId: string, modelId: string, tools: any[], options?: any): Promise<{ content: string; tool_calls?: any[] }> {
        const provider = this.providers.get(providerId);
        if (!provider) throw new Error(`Provider ${providerId} not found`);

        if (!provider.isConfigured()) {
            throw new Error(`Provider ${provider.name} is not configured. Please add an API Key in Settings.`);
        }

        if (!provider.generateWithTools) {
            throw new Error(`Provider ${provider.name} does not support tool calling.`);
        }

        return provider.generateWithTools(messages, modelId, tools, options);
    }

    async *generateWithToolsStream(messages: any[], providerId: string, modelId: string, tools: any[], options?: any): AsyncGenerator<{ content?: string; tool_calls?: any[] }> {
        const provider = this.providers.get(providerId);
        if (!provider) throw new Error(`Provider ${providerId} not found`);

        if (!provider.isConfigured()) {
            throw new Error(`Provider ${provider.name} is not configured. Please add an API Key in Settings.`);
        }

        if (provider.generateWithToolsStream) {
            yield* provider.generateWithToolsStream(messages, modelId, tools, options);
        } else if (provider.generateWithTools) {
            // Fallback to non-streaming
            const result = await provider.generateWithTools(messages, modelId, tools, options);
            yield result;
        } else {
            throw new Error(`Provider ${provider.name} does not support tool calling.`);
        }
    }
}

export const aiManager = new AIProviderManager();
