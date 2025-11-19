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
            messages: messages,
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
                            content: m.content
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
    id = 'google';
    name = 'Google Gemini';
    private client: GoogleGenerativeAI | null = null;

    models: AIModel[] = [
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', providerId: 'google', description: 'Google\'s most intelligent model.', contextWindow: 2000000 },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', providerId: 'google', description: 'Legacy, ex-flagship model.', contextWindow: 1000000 },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', providerId: 'google', description: 'Fast and efficient.', contextWindow: 1000000 }
    ];

    configure(apiKey: string) {
        this.client = new GoogleGenerativeAI(apiKey);
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generateText(prompt: string, modelId: string, options?: any): Promise<string> {
        if (!this.client) throw new Error('Gemini not configured');

        const model = this.client.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    async generateWithTools(messages: any[], modelId: string, tools: any[], options?: any): Promise<{ content: string; tool_calls?: any[] }> {
        if (!this.client) throw new Error('Gemini not configured');

        const model = this.client.getGenerativeModel({ model: modelId });

        // Map messages to Gemini format
        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
        }));

        const lastMessage = messages[messages.length - 1];
        const prompt = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

        const chat = model.startChat({
            history: history,
            tools: tools as any // Gemini expects tools wrapped in an array, but tools is already the object with function_declarations
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
}

export const aiManager = new AIProviderManager();
