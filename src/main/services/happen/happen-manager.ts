import { initializeHappen, HappenNode } from 'happen-core';
import { FileSystemNode } from './nodes/fs-node';
import { LLMNode } from './nodes/llm-node';
import { AgentNode, AgentState, AgentConfig } from './nodes/agent-node';
import { TerminalNode } from './nodes/terminal-node';
import { BrowserNode } from './nodes/browser-node';
import { NetNode } from './nodes/net-node';
import { WorkbenchNode } from './nodes/workbench-node';
import { shadowService } from './shadow-service';

export class HappenManager {
    private static instance: HappenManager;
    private nodes: Map<string, any> = new Map();
    private isInitialized: boolean = false;
    private systemNode: HappenNode | null = null;
    private createNodeFactory: ((id: string, config: any) => HappenNode) | null = null;

    private constructor() { }

    public static getInstance(): HappenManager {
        if (!HappenManager.instance) {
            HappenManager.instance = new HappenManager();
        }
        return HappenManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log('[HappenManager] Initializing...');

        try {
            // Initialize Happen Core (connects to NATS)
            const { createNode } = await initializeHappen({
                servers: ['localhost:4222']
            });

            this.createNodeFactory = createNode;

            // Create a system node for dispatching tasks from the main process
            this.systemNode = createNode('system-control', {});

            // Listen for delegation requests from agents who need to spawn other agents
            this.systemNode.on('system:delegate-task', async (data: any) => {
                const { targetAgentId, prompt, contextData } = data;
                console.log(`[HappenManager] System received delegation request for ${targetAgentId}`);
                try {
                    return await this.dispatchTask(targetAgentId, prompt, contextData);
                } catch (e: any) {
                    return { success: false, error: e.message };
                }
            });

            // Wake Up Protocol: Listen for agent completion events
            this.systemNode.on('system:agent-complete', async (event: any) => {
                const { agentId, result, error } = event.payload || {};
                console.log(`[HappenManager] Received completion from ${agentId}`);

                // Find any agents waiting for this agent
                const agents = this.getAgents(); // This gets state, but we need the Node instance to call methods

                for (const [id, node] of this.nodes.entries()) {
                    if (node instanceof AgentNode) {
                        const state = node.getState();
                        if (state.status === 'suspended' && state.suspendedForIds?.includes(agentId)) {
                            console.log(`[HappenManager] Waking up parent agent: ${state.id}`);
                            // We need to cast node to AgentNode to access the method (it is protected/private usually, but we'll make it public or accessible)
                            // For now assuming we can call a method on it.
                            await (node as any).handleChildCompletion({ agentId, result, error });
                        }
                    }
                }
            });

            // Create Service Nodes (Always available)
            this.createServiceNode(createNode, 'fs-service', FileSystemNode);
            this.createServiceNode(createNode, 'llm-service', LLMNode);
            this.createServiceNode(createNode, 'terminal-service', TerminalNode);
            this.createServiceNode(createNode, 'browser-service', BrowserNode);
            this.createServiceNode(createNode, 'net-service', NetNode);
            this.createServiceNode(createNode, 'workbench-service', WorkbenchNode);

            // Bootstrap: Spawn the Root Architect
            // This is the only hardcoded agent. All others are spawned dynamically.
            await this.spawnDynamic({
                id: 'architect',
                role: 'System Architect',
                systemPrompt: `You are the Architect Agent in the Guru AI Mission Control.
Your role is to analyze user requirements and create high-level plans.
You act as the orchestrator. When you receive a complex task, break it down and delegate implementation to the 'coder' and verification to 'qa'.

IMPORTANT:
1. Start by listing the high-level steps.
2. Delegate specific sub-tasks to the 'coder' agent.
3. Once coding is complete, delegate testing to the 'qa' agent.
4. Consolidate the results and present a final summary to the user.

Use the provided tools to perform these actions. Do not simulate tool calls.
Capabilities: System design, architecture planning, task breakdown, delegation.`,
                capabilities: ['system-design', 'planning', 'delegation', 'spawn_ephemeral_agent']
            });

            // Register Shadow Service bridge
            shadowService.onActionComplete((action, result, error) => {
                if (this.systemNode) {
                    console.log(`[HappenManager] Notifying agent-${action.agentId} of action completion`);
                    this.systemNode.send(`agent:${action.agentId}:action-result`, {
                        actionId: action.id,
                        status: error ? 'rejected' : 'approved',
                        result,
                        error
                    } as any);
                }
            });

            this.isInitialized = true;
            console.log('[HappenManager] Initialized successfully');
        } catch (error) {
            console.error('[HappenManager] Failed to initialize:', error);
        }
    }

    public getAgents(): AgentState[] {
        const agents: AgentState[] = [];
        for (const node of this.nodes.values()) {
            if (node instanceof AgentNode) {
                agents.push(node.getState());
            }
        }
        return agents;
    }

    private createServiceNode(
        createNodeFactory: (id: string, config: any) => HappenNode,
        id: string,
        NodeClass: any
    ) {
        const happenNode = createNodeFactory(id, {});
        const serviceNode = new NodeClass(happenNode);
        this.nodes.set(id, serviceNode);
        console.log(`[HappenManager] Created node: ${id}`);
    }

    public async spawnDynamic(config: AgentConfig): Promise<string> {
        if (!this.createNodeFactory) {
            throw new Error('HappenManager not initialized - cannot spawn agent');
        }

        const agentId = config.id;
        const nodeId = `agent-${agentId}`;

        if (this.nodes.has(nodeId)) {
            console.log(`[HappenManager] Agent ${agentId} already exists`);
            return agentId;
        }

        console.log(`[HappenManager] Spawning dynamic agent: ${agentId} (${config.role})`);
        const happenNode = this.createNodeFactory(nodeId, {});
        const agentNode = new AgentNode(happenNode, config);
        this.nodes.set(nodeId, agentNode);

        // Emit system event for UI observability
        if (this.systemNode) {
            this.systemNode.send('system:agent-spawned', {
                id: agentId,
                role: config.role,
                timestamp: Date.now()
            } as any);
        }

        return agentId;
    }

    /**
     * Dispatch a task to a specific agent. Spawns the agent if it doesn't exist.
     */
    public async dispatchTask(agentId: string, prompt: string, contextData: any): Promise<any> {
        if (!this.systemNode) {
            throw new Error('HappenManager not initialized');
        }

        // Ensure the agent exists before dispatching
        const nodeId = `agent-${agentId}`;
        if (!this.nodes.has(nodeId)) {
            console.error(`[HappenManager] Agent ${agentId} not found`);
            return { success: false, error: `Agent ${agentId} not found. Please spawn it first.` };
        }

        console.log(`[HappenManager] Dispatching task to agent-${agentId}`);

        try {
            // Use send().return() pattern for request-response
            const result = await this.systemNode.send(`agent:${agentId}:task`, {
                prompt,
                contextData: contextData || {}
            } as any).return();
            return result;
        } catch (error: any) {
            console.error(`[HappenManager] Failed to dispatch task:`, error);
            throw error;
        }
    }

    /**
     * Dispatch a task asynchronously (Fire and Forget).
     * Used by spawn_async_agent.
     */
    public async dispatchTaskAsync(agentId: string, prompt: string, contextData: any): Promise<void> {
        if (!this.systemNode) {
            throw new Error('HappenManager not initialized');
        }

        const nodeId = `agent-${agentId}`;
        if (!this.nodes.has(nodeId)) {
            console.error(`[HappenManager] Agent ${agentId} not found for async dispatch`);
            return;
        }

        console.log(`[HappenManager] Async dispatch to agent-${agentId}`);

        // Fire and forget - do NOT call .return()
        this.systemNode.send(`agent:${agentId}:task`, {
            prompt,
            contextData: contextData || {}
        } as any);
    }
}

export const happenManager = HappenManager.getInstance();
