import { HappenNode } from 'happen-core';
import { natsService } from '../../nats-service';
import { StringCodec } from 'nats';

export interface AgentConfig {
    id: string;
    role: string;
    systemPrompt: string;
    capabilities: string[];
}

export type AgentStatus = 'idle' | 'active' | 'paused' | 'error' | 'waiting_approval' | 'suspended';

export interface AgentState {
    id: string;
    name: string;
    role: string;
    status: AgentStatus;
    currentTask?: string;
    tools: string[];
    waitingFor?: string; // Action ID if waiting
    suspendedForIds?: string[]; // IDs of agents we are waiting for
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
    private suspendedForIds: Set<string> = new Set();

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
            waitingFor: this.waitingForActionId,
            suspendedForIds: Array.from(this.suspendedForIds)
        };
    }

    protected initialize(): void {
        // Register the entry point for the Event Continuum
        this.node.on(`agent:${this.config.id}:task`, this.startTask.bind(this));

        // Listen for action approval results (still needed for shadow mode)
        this.node.on(`agent:${this.config.id}:action-result`, this.handleActionResult.bind(this));
    }

    private async persistState() {
        try {
            const kv = await natsService.getSwarmStateBucket();
            const sc = StringCodec();
            await kv.put(`agent.${this.config.id}`, sc.encode(JSON.stringify(this.getState())));
        } catch (error) {
            console.error(`[Agent:${this.config.id}] Failed to persist state:`, error);
        }
    }

    private emitStatus() {
        // Persist state first
        this.persistState();

        // Use send for status updates (fire-and-forget)
        this.node.send('system:agent-status', {
            type: 'system:agent-status',
            payload: this.getState()
        });
    }

    private cleanup() {
        // Emit completion event if we are not suspended
        if (this.status !== 'suspended') {
            // If we are cleaning up due to error or completion, notify system
            // Note: We don't have the result here easily unless we store it.
            // For now, we'll rely on the fact that if we are here, we are done.
            // Ideally, agentStep should emit the completion event with the result.
        }

        this.status = 'idle';
        this.currentTask = '';
        this.waitingForActionId = undefined;
        this.suspendedForIds.clear();
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
            this.suspendedForIds.clear();
            this.emitStatus();

            // Initialize context for the flow
            context.messages = [
                { role: 'system', content: this.config.systemPrompt + "\n\nIMPORTANT: You are an autonomous agent. Use the provided tools to complete your task. You can execute multiple tools in parallel to be efficient." },
                { role: 'user', content: `Task: ${event.prompt}\nContext: ${JSON.stringify(event.contextData || {})}` }
            ];
            context.steps = 0;

            // Store context for resumption
            this.activeContext = context;

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
            // Use Event-Driven LLM Call
            // This decouples the agent from the specific AI implementation
            const response = await this.node.send('llm:generate', {
                payload: {
                    messages: context.messages,
                    tools: context.tools,
                    config: { model: 'gemini-3-pro-preview' } // Default to high intelligence
                }, type: 'event'
            }).return();

            if (!response.success) {
                throw new Error(response.error || 'LLM generation failed');
            }

            // Add assistant response to history
            context.messages.push({
                role: 'assistant',
                content: response.content || '',
                tool_calls: response.tool_calls
            });

            // Check for completion (no tool calls)
            if (!response.tool_calls || response.tool_calls.length === 0) {
                console.log(`[Agent:${this.config.id}] Task completed.`);

                // Emit completion event
                this.node.send('system:agent-complete', {
                    type: 'system:agent-complete',
                    payload: {
                        agentId: this.config.id,
                        result: response.content,
                        error: null
                    }
                });

                this.cleanup();
                return { success: true, output: response.content };
            }

            // Store tool calls in context for the next step
            context.currentToolCalls = response.tool_calls;

            // Return next function
            return this.executeTools.bind(this);

        } catch (error: any) {
            console.error(`[Agent:${this.config.id}] Error in reasoning step:`, error);

            // Emit error event
            this.node.send('system:agent-complete', {
                type: 'system:agent-complete',
                payload: {
                    agentId: this.config.id,
                    result: null,
                    error: error.message
                }
            });

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

                    // Handle Suspension Signal (from wait_for_agents)
                    if (result && result._action === 'suspend') {
                        return {
                            _suspend: true,
                            waitingFor: result.waitingFor,
                            tool_call_id: call.id,
                            role: 'tool',
                            name: toolName,
                            content: JSON.stringify({ status: 'suspended', waitingFor: result.waitingFor })
                        };
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

            // Check for suspension
            const suspendSignal = toolResults.find((r: any) => r._suspend);
            if (suspendSignal) {
                console.log(`[Agent:${this.config.id}] Suspending execution to wait for: ${suspendSignal.waitingFor.join(', ')}`);
                this.status = 'suspended';
                suspendSignal.waitingFor.forEach((id: string) => this.suspendedForIds.add(id));
                this.emitStatus();

                // We stop the loop here. The state is saved. 
                // We will be woken up by handleChildCompletion.
                // We need to save the context so we can resume.
                // For now, we assume context is kept in memory (since process is alive).
                // In a full restart scenario, we'd need to hydrate context from DB.

                // Add the tool results (including the suspend message) to history so we don't re-execute
                const cleanResults = toolResults.map((r: any) => {
                    const { _suspend, waitingFor, ...rest } = r;
                    return rest;
                });
                context.messages.push(...cleanResults);
                context.currentToolCalls = null;

                // Return null/undefined to stop the continuum
                return;
            }

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

    /**
     * Called by HappenManager when a child agent completes.
     */
    public async handleChildCompletion(event: { agentId: string, result: any, error: any }) {
        console.log(`[Agent:${this.config.id}] Handling child completion: ${event.agentId}`);

        if (this.suspendedForIds.has(event.agentId)) {
            this.suspendedForIds.delete(event.agentId);

            // Add the result to the conversation history as a system message or tool result
            // Since we don't have easy access to the 'context' object here (it's in the closure of the loop),
            // we might need to rethink how we inject this.
            // Ideally, we should have stored the context in the class or passed it around.

            // For this implementation, we'll assume we can just log it and resume.
            // But wait, we need to inject the result into the LLM's context!

            // HACK: We need to find the tool call that was waiting for this agent.
            // But we already pushed the tool result in executeTools.
            // So we should append a new message saying "Agent X completed: ..."

            // Since we don't have the context here, we are a bit stuck unless we refactor to store context in `this`.
            // Let's assume for now we can't easily inject it without refactoring.
            // BUT, we can just change status to 'active' and call `agentStep` if we are no longer waiting.

            // Wait, if we lost the `context` object (because the previous loop ended), we can't just call `agentStep`.
            // We need to persist the context or keep it in `this`.

            // Refactor: Store context in `this.activeContext`
        }

        if (this.suspendedForIds.size === 0) {
            console.log(`[Agent:${this.config.id}] All dependencies met. Resuming...`);
            this.status = 'active';
            this.emitStatus();

            // RESUME LOGIC:
            // We need to call agentStep again.
            // We need the context.
            if (this.activeContext) {
                // Inject the result
                this.activeContext.messages.push({
                    role: 'system',
                    content: `System Notification: Agent ${event.agentId} has completed its task.\nResult: ${event.result || event.error}`
                });

                // Resume the loop
                // We manually trigger the next step
                this.agentStep({}, this.activeContext);
            } else {
                console.error(`[Agent:${this.config.id}] Cannot resume - context lost.`);
            }
        } else {
            this.persistState(); // Update suspendedForIds
        }
    }

    private activeContext: any = null; // Store context for resumption

    private async executeToolEvent(toolName: string, args: any): Promise<any> {
        try {
            // Use node.send().return() for request-response pattern
            const result = await this.node.send(toolName, {
                type: toolName,
                payload: args
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
