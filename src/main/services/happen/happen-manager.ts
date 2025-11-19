import { initializeHappen, HappenNode } from 'happen-core';
import { FileSystemNode } from './nodes/fs-node';
import { LLMNode } from './nodes/llm-node';
import { AgentNode, AgentState } from './nodes/agent-node';
import { TerminalNode } from './nodes/terminal-node';
import { BrowserNode } from './nodes/browser-node';
import { NetNode } from './nodes/net-node';
import { AGENT_CONFIGS } from './nodes/agent-configs';

export class HappenManager {
    private static instance: HappenManager;
    private nodes: Map<string, any> = new Map();
    private isInitialized: boolean = false;
    private systemNode: HappenNode | null = null;

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
            // Mocking config for now as we might not have NATS running in this environment
            const { createNode } = await initializeHappen({
                servers: ['localhost:4222']
            });

            // Create a system node for dispatching tasks from the main process
            this.systemNode = createNode('system-control', {});

            // Create Service Nodes
            this.createServiceNode(createNode, 'fs-service', FileSystemNode);
            this.createServiceNode(createNode, 'llm-service', LLMNode);
            this.createServiceNode(createNode, 'terminal-service', TerminalNode);
            this.createServiceNode(createNode, 'browser-service', BrowserNode);
            this.createServiceNode(createNode, 'net-service', NetNode);

            // Create Agent Nodes
            this.createAgentNode(createNode, AGENT_CONFIGS.architect);
            this.createAgentNode(createNode, AGENT_CONFIGS.coder);
            this.createAgentNode(createNode, AGENT_CONFIGS.qa);

            this.isInitialized = true;
            console.log('[HappenManager] Initialized successfully');
        } catch (error) {
            console.error('[HappenManager] Failed to initialize:', error);
            // Don't throw, just log. Allows app to start even if NATS is missing.
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

    private createAgentNode(
        createNodeFactory: (id: string, config: any) => HappenNode,
        config: any
    ) {
        const happenNode = createNodeFactory(`agent-${config.id}`, {});
        const agentNode = new AgentNode(happenNode, config);
        this.nodes.set(`agent-${config.id}`, agentNode);
        console.log(`[HappenManager] Created agent: ${config.id}`);
    }

    /**
     * Dispatch a task to a specific agent
     */
    public async dispatchTask(agentId: string, prompt: string, contextData: any): Promise<any> {
        if (!this.systemNode) {
            throw new Error('HappenManager not initialized');
        }

        console.log(`[HappenManager] Dispatching task to agent-${agentId}`);
        
        // We can use the system node to call the agent
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
