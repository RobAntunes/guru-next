import { initializeHappen, HappenNode } from 'happen-core';
import { FileSystemNode } from './nodes/fs-node';
import { LLMNode } from './nodes/llm-node';
import { AgentNode, AgentState } from './nodes/agent-node';
import { TerminalNode } from './nodes/terminal-node';
import { BrowserNode } from './nodes/browser-node';
import { NetNode } from './nodes/net-node';
import { AGENT_CONFIGS } from './nodes/agent-configs';
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

            // Create Service Nodes (Always available)
            this.createServiceNode(createNode, 'fs-service', FileSystemNode);
            this.createServiceNode(createNode, 'llm-service', LLMNode);
            this.createServiceNode(createNode, 'terminal-service', TerminalNode);
            this.createServiceNode(createNode, 'browser-service', BrowserNode);
            this.createServiceNode(createNode, 'net-service', NetNode);

            // NOTE: Agents are no longer created upfront. They are spawned on demand.
            // We only create the Architect initially if we want a default entry point, 
            // but strictly speaking, even the architect can be lazy loaded upon first user message.
            // For better UX (showing at least one agent), we might spawn Architect, 
            // but the requirement is "no coder agent sitting around".
            
            // Register Shadow Service bridge
            shadowService.onActionComplete((action, result, error) => {
                if (this.systemNode) {
                    console.log(`[HappenManager] Notifying agent-${action.agentId} of action completion`);
                    this.systemNode.emit(`agent:${action.agentId}:action-result`, {
                        actionId: action.id,
                        status: error ? 'rejected' : 'approved',
                        result,
                        error
                    });
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

    private ensureAgent(agentId: string): void {
        const nodeId = `agent-${agentId}`;
        if (this.nodes.has(nodeId)) {
            return;
        }

        if (!this.createNodeFactory) {
            throw new Error('HappenManager not initialized - cannot spawn agent');
        }

        const config = AGENT_CONFIGS[agentId];
        if (!config) {
            throw new Error(`Unknown agent type: ${agentId}`);
        }

        console.log(`[HappenManager] Spawning agent: ${agentId} (Lazy Load)`);
        const happenNode = this.createNodeFactory(nodeId, {});
        const agentNode = new AgentNode(happenNode, config);
        this.nodes.set(nodeId, agentNode);
    }

    /**
     * Dispatch a task to a specific agent. Spawns the agent if it doesn't exist.
     */
    public async dispatchTask(agentId: string, prompt: string, contextData: any): Promise<any> {
        if (!this.systemNode) {
            throw new Error('HappenManager not initialized');
        }

        // Ensure the agent exists before dispatching
        try {
            this.ensureAgent(agentId);
        } catch (e: any) {
            console.error(`[HappenManager] Failed to spawn agent ${agentId}:`, e);
            return { success: false, error: `Could not spawn agent: ${e.message}` };
        }

        console.log(`[HappenManager] Dispatching task to agent-${agentId}`);
        
        try {
             const result = await this.systemNode.call(`agent:${agentId}:task`, {
                prompt,
                contextData: contextData || {}
            });
            return result;
        } catch (error: any) {
            console.error(`[HappenManager] Failed to dispatch task:`, error);
            throw error;
        }
    }
}

export const happenManager = HappenManager.getInstance();
