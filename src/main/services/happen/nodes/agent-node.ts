import { HappenNode } from 'happen-core';
import { aiManager } from '../../ai-manager';

export interface AgentConfig {
    id: string;
    role: string;
    systemPrompt: string;
    capabilities: string[];
}

export type AgentStatus = 'idle' | 'active' | 'paused' | 'error';

export interface AgentState {
    id: string;
    name: string;
    role: string;
    status: AgentStatus;
    currentTask?: string;
    tools: string[];
}

interface ToolCall {
    name: string;
    args: any;
}

export class AgentNode {
    protected node: HappenNode;
    protected config: AgentConfig;
    private maxSteps: number = 15; // Increased steps for complex interactions
    private status: AgentStatus = 'idle';
    private currentTask: string = '';

    constructor(node: HappenNode, config: AgentConfig) {
        this.node = node;
        this.config = config;
        this.initialize();
    }

    public getState(): AgentState {
        return {
            id: this.config.id,
            name: `Agent-${this.config.id}`,
            role: this.config.role,
            status: this.status,
            currentTask: this.currentTask,
            tools: this.config.capabilities
        };
    }

    protected initialize(): void {
        // Listen for tasks assigned to this agent
        this.node.on(`agent:${this.config.id}:task`, async (event: any, context: any) => {
            try {
                console.log(`[Agent:${this.config.id}] Received task:`, event);
                this.status = 'active';
                this.currentTask = event.prompt;
                
                // Emit status change
                this.emitStatus();

                const result = await this.runAgentLoop(event, context);
                
                this.status = 'idle';
                this.currentTask = '';
                
                // Emit status change
                this.emitStatus();
                
                return result;
            } catch (error: any) {
                console.error(`[Agent:${this.config.id}] Error handling task:`, error);
                this.status = 'error';
                this.emitStatus();
                return { success: false, error: error.message };
            }
        });
    }

    private emitStatus() {
        this.node.emit('system:agent-status', this.getState());
    }

    protected async runAgentLoop(initialEvent: any, context: any): Promise<any> {
        // Initialize conversation history
        let messages = [
            { role: 'system', content: this.config.systemPrompt },
            { role: 'user', content: `Task: ${initialEvent.prompt}\nContext: ${JSON.stringify(initialEvent.contextData || {})}` }
        ];

        let steps = 0;
        
        while (steps < this.maxSteps) {
            steps++;
            console.log(`[Agent:${this.config.id}] Step ${steps}/${this.maxSteps}`);
            
            // 1. Generate response from LLM
            const responseText = await this.generateResponse(messages);
            
            // 2. Check for Final Answer (explicit termination)
            if (responseText.includes('<final_answer>') || responseText.includes('[Final Answer]')) {
                console.log(`[Agent:${this.config.id}] Final answer detected.`);
                return { success: true, output: responseText };
            }

            // 3. Parse for Tool Calls
            const toolCall = this.parseToolCall(responseText);
            
            if (toolCall) {
                 console.log(`[Agent:${this.config.id}] Executing tool: ${toolCall.name}`);
                 messages.push({ role: 'assistant', content: responseText });
                 
                 let result;
                 
                 // Handle Delegation specifically
                 if (toolCall.name === 'agent:delegate') {
                     result = await this.handleDelegation(toolCall.args);
                 } else {
                     // Execute Service Tool via NATS request
                     try {
                         result = await this.node.call(toolCall.name, toolCall.args);
                     } catch (error: any) {
                         console.error(`[Agent:${this.config.id}] Tool execution failed:`, error);
                         result = { success: false, error: error.message };
                     }
                 }
                 
                 console.log(`[Agent:${this.config.id}] Tool Result:`, JSON.stringify(result).substring(0, 100) + '...');
                 messages.push({ role: 'user', content: `Tool Output: ${JSON.stringify(result)}` });
            } else {
                // No tool call, but no final answer tag? 
                // It might be a question or a partial thought.
                // If it looks like a completion, we return.
                // Ideally, we force the agent to use <final_answer> tag in the system prompt.
                // For now, we'll treat it as a result if it doesn't look like an internal monologue.
                
                // Heuristic: if it's short and chatty, it might be done.
                // Let's return it as the result.
                return { success: true, output: responseText };
            }
        }
        
        return { success: false, error: 'Max steps reached without completion' };
    }

    private async generateResponse(messages: any[]): Promise<string> {
        try {
             // Priority: OpenAI > Anthropic > Gemini > Mock
             if (aiManager.getApiKey('openai')) {
                // Prefer GPT-4o for agents as they need reasoning
                return await aiManager.generateText(
                    messages.map(m => `${m.role}: ${m.content}`).join('\n'), 
                    'openai', 
                    'gpt-4o',
                    { temperature: 0.2, maxTokens: 2000 }
                );
             } else if (aiManager.getApiKey('anthropic')) {
                 return await aiManager.generateText(
                    messages.map(m => `${m.role}: ${m.content}`).join('\n'), 
                    'anthropic', 
                    'claude-4.5-sonnet',
                    { temperature: 0.2, maxTokens: 2000 }
                 );
             } else if (aiManager.getApiKey('google')) {
                 return await aiManager.generateText(
                    messages.map(m => `${m.role}: ${m.content}`).join('\n'), 
                    'google', 
                    'gemini-2.5-pro',
                    { temperature: 0.2, maxTokens: 2000 }
                 );
             }
             
             // Fallback dummy if no keys
             console.warn(`[Agent:${this.config.id}] No AI keys configured.`);
             return "I cannot proceed without an AI API key configured. Please add one in Settings. [Final Answer: Error]";
        } catch (e: any) {
            console.error(`[Agent:${this.config.id}] AI Generation Error:`, e);
            return `Error generating response: ${e.message} [Final Answer: Error]`;
        }
    }

    private parseToolCall(text: string): ToolCall | null {
        // Robust parsing for <tool_code>
        // 1. Match the tag
        const match = text.match(/<tool_code>([\s\S]*?)<\/tool_code>/);
        if (!match || !match[1]) return null;

        let jsonStr = match[1].trim();
        
        // 2. Clean up markdown code blocks if present (```json ... ```)
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

        try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.name && parsed.args) {
                return parsed as ToolCall;
            }
        } catch (e) {
            console.error(`[Agent:${this.config.id}] Failed to parse tool JSON:`, e);
            console.error(`[Agent:${this.config.id}] Bad JSON content:`, jsonStr);
        }
        return null;
    }

    private async handleDelegation(args: { targetAgentId: string, task: string }): Promise<any> {
        const { targetAgentId, task } = args;
        if (!targetAgentId || !task) {
            return { success: false, error: "Missing targetAgentId or task for delegation" };
        }

        console.log(`[Agent:${this.config.id}] Delegating to ${targetAgentId}: ${task}`);
        
        try {
            // Dispatch to the target agent's task topic
            const result = await this.node.call(`agent:${targetAgentId}:task`, {
                prompt: task,
                contextData: { 
                    delegatedBy: this.config.id,
                    parentTask: this.currentTask
                }
            });
            return result;
        } catch (error: any) {
            return { success: false, error: `Delegation failed: ${error.message}` };
        }
    }
}
