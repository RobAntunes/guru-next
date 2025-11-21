import { HappenNode } from 'happen-core';
import { aiManager } from '../../ai-manager';

export interface AgentConfig {
    id: string;
    role: string;
    systemPrompt: string;
    capabilities: string[];
}

export type AgentStatus = 'idle' | 'active' | 'paused' | 'error' | 'waiting_approval';

export interface AgentState {
    id: string;
    name: string;
    role: string;
    status: AgentStatus;
    currentTask?: string;
    tools: string[];
    waitingFor?: string; // Action ID if waiting
}

interface ToolCall {
    name: string;
    args: any;
}

export class AgentNode {
    protected node: HappenNode;
    protected config: AgentConfig;
    private maxSteps: number = 30; // Reduced from 75 to prevent long feedback loops
    private status: AgentStatus = 'idle';
    private currentTask: string = '';
    private waitingForActionId?: string;

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
            tools: this.config.capabilities,
            waitingFor: this.waitingForActionId
        };
    }

    protected initialize(): void {
        // Register the entry point for the Event Continuum
        this.node.on(`agent:${this.config.id}:task`, this.startTask.bind(this));

        // Listen for action approval results (still needed for shadow mode)
        this.node.on(`agent:${this.config.id}:action-result`, this.handleActionResult.bind(this));
    }

    private emitStatus() {
        this.node.emit('system:agent-status', this.getState());
    }

    private cleanup() {
        this.status = 'idle';
        this.currentTask = '';
        this.waitingForActionId = undefined;
        this.emitStatus();
    }

    /**
     * Step 1: Initialize the task and context
     */
    private async startTask(event: any, context: any) {
        try {
            console.log(`[Agent:${this.config.id}] Starting task flow`);
            this.status = 'active';
            this.currentTask = event.prompt;
            this.emitStatus();

            // Initialize context for the flow
            context.messages = [
                { role: 'system', content: this.config.systemPrompt + "\n\nIMPORTANT: You are an autonomous agent. Use the provided tools to complete your task. You can execute multiple tools in parallel to be efficient." },
                { role: 'user', content: `Task: ${event.prompt}\nContext: ${JSON.stringify(event.contextData || {})}` }
            ];
            context.steps = 0;

            // Get tools once
            context.tools = await this.getAgentTools();

            // Return the next function in the continuum
            return this.agentStep.bind(this);
        } catch (error: any) {
            console.error(`[Agent:${this.config.id}] Error initializing task:`, error);
            this.status = 'error';
            this.emitStatus();
            return { success: false, error: error.message };
        }
    }

    /**
     * Step 2: AI Reasoning Step
     */
    private async agentStep(event: any, context: any) {
        context.steps++;
        console.log(`[Agent:${this.config.id}] Step ${context.steps}/${this.maxSteps}`);

        if (context.steps >= this.maxSteps) {
            this.cleanup();
            return { success: false, error: `Max steps (${this.maxSteps}) reached. Task aborted to prevent infinite loops.` };
        }

        try {
            // Use native function calling
            const response = await aiManager.generateWithTools(
                context.messages,
                'openai',
                'gpt-4o',
                context.tools
            );

            // Add assistant response to history
            context.messages.push({
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.tool_calls
            });

            // Check for completion (no tool calls)
            if (!response.tool_calls || response.tool_calls.length === 0) {
                console.log(`[Agent:${this.config.id}] Task completed.`);
                this.cleanup();
                return { success: true, output: response.content };
            }

            // Store tool calls in context for the next step
            context.currentToolCalls = response.tool_calls;

            // Return next function
            return this.executeTools.bind(this);

        } catch (error: any) {
            console.error(`[Agent:${this.config.id}] Error in reasoning step:`, error);
            this.cleanup();
            return { success: false, error: error.message };
        }
    }

    /**
     * Step 3: Tool Execution Step
     */
    private async executeTools(event: any, context: any) {
        const toolCalls = context.currentToolCalls || [];
        console.log(`[Agent:${this.config.id}] Executing ${toolCalls.length} tools in parallel...`);

        try {
            // Execute tools in parallel (Async Event Pattern)
            const toolResults = await Promise.all(toolCalls.map(async (call: any) => {
                const toolName = call.function.name;
                const args = JSON.parse(call.function.arguments);

                try {
                    let result;
                    if (toolName === 'agent:delegate') {
                        result = await this.handleDelegation(args);
                    } else {
                        // Execute via Event Bus (Request-Reply)
                        result = await this.executeToolEvent(toolName, args);

                        // Handle Staged Action
                        if (result && result.status === 'staged') {
                            console.log(`[Agent:${this.config.id}] Action staged (ID: ${result.actionId}). Pausing for approval...`);
                            
                            this.status = 'waiting_approval';
                            this.waitingForActionId = result.actionId;
                            this.emitStatus();
                            
                            // Wait for approval
                            result = await this.waitForApproval(result.actionId);
                            
                            this.waitingForActionId = undefined;
                            this.status = 'active';
                            this.emitStatus();
                        }
                    }

                    return {
                        tool_call_id: call.id,
                        role: 'tool',
                        name: toolName,
                        content: JSON.stringify(result)
                    };
                } catch (error: any) {
                    console.error(`[Agent:${this.config.id}] Tool ${toolName} failed:`, error);
                    return {
                        tool_call_id: call.id,
                        role: 'tool',
                        name: toolName,
                        content: JSON.stringify({ success: false, error: error.message })
                    };
                }
            }));

            // Add results to history
            context.messages.push(...toolResults);
            context.currentToolCalls = null;

            // Loop back to reasoning step
            return this.agentStep.bind(this);

        } catch (error: any) {
            console.error(`[Agent:${this.config.id}] Error in tool execution:`, error);
            this.cleanup();
            return { success: false, error: error.message };
        }
    }

    private async executeToolEvent(toolName: string, args: any): Promise<any> {
        try {
            // Use node.send().return() for request-response pattern
            const result = await this.node.send(toolName, {
                type: toolName,
                payload: args,
            }).return();

            return result;
        } catch (error: any) {
            console.error(`[Agent:${this.config.id}] Tool ${toolName} request failed:`, error);
            throw error;
        }
    }

    private async getAgentTools(): Promise<any[]> {
        // Import tools dynamically to avoid circular deps
        const { allTools } = await import('../../ai-tools');
        return allTools;
    }

    private approvalPromises: Map<string, (value: any) => void> = new Map();

    private handleActionResult(event: any) {
        const actionId = event.payload?.actionId;
        if (actionId && this.approvalPromises.has(actionId)) {
            const resolve = this.approvalPromises.get(actionId)!;
            this.approvalPromises.delete(actionId);

            if (event.payload.status === 'approved') {
                resolve(event.payload.result);
            } else {
                resolve({
                    success: false,
                    error: `Action rejected by user: ${event.payload.error || 'Security policy'}`
                });
            }
        }
    }

    private async waitForApproval(actionId: string): Promise<any> {
        return new Promise((resolve) => {
            this.approvalPromises.set(actionId, resolve);

            // Set a reasonably long timeout so user has time to react
            setTimeout(() => {
                if (this.approvalPromises.has(actionId)) {
                    this.approvalPromises.delete(actionId);
                    resolve({ success: false, error: 'Action approval timed out (10m)' });
                }
            }, 600000); // 10 minutes timeout
        });
    }

    private async handleDelegation(args: { targetAgentId: string, task: string }): Promise<any> {
        const { targetAgentId, task } = args;
        if (!targetAgentId || !task) {
            return { success: false, error: "Missing targetAgentId or task for delegation" };
        }

        console.log(`[Agent:${this.config.id}] Delegating to ${targetAgentId} via System: ${task}`);

        try {
            // Use the same event-driven pattern for delegation
            const result = await this.executeToolEvent(`system:delegate-task`, {
                targetAgentId,
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
