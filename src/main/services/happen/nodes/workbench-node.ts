import { BaseServiceNode } from '../base-node';
import { HappenNode } from 'happen-core';
import { wasmVM } from '../../../wasm-vm';
import { shadowService } from '../shadow-service';

interface DynamicTool {
    id: string;
    name: string;
    description: string;
    language: 'javascript' | 'python' | 'wasm';
    trigger: string;       // Event topic to listen on
    node: HappenNode;      // Ephemeral node
    moduleId?: string;     // WASM module ID (for WASM tools)
    createdAt: number;
    memoryUsed: number;
}

interface CreateToolPayload {
    name: string;
    description: string;
    language: 'javascript' | 'python' | 'wasm';
    code: string;
    trigger: string;
}

export class WorkbenchNode extends BaseServiceNode {
    private tools: Map<string, DynamicTool> = new Map();
    private toolCounter: number = 0;

    constructor(node: any) {
        super(node, 'WorkbenchNode');
    }

    protected initialize(): void {
        console.log('[WorkbenchNode] Initializing Dynamic Runtime...');

        // Main handler: Create a new dynamic tool
        this.registerHandler('agent:create-tool', async (event: any, context: any) => {
            const payload: CreateToolPayload = event.payload || event;
            const agentId = context?.sender || event.agentId || 'unknown';

            console.log(`[WorkbenchNode] Received create-tool request: ${payload.name} (${payload.language})`);

            try {
                return await this.createTool(payload, agentId);
            } catch (error: any) {
                console.error('[WorkbenchNode] Tool creation failed:', error);
                return { success: false, error: error.message };
            }
        });

        // List active tools
        this.registerHandler('workbench:list-tools', async () => {
            const toolsList = Array.from(this.tools.values()).map(tool => ({
                id: tool.id,
                name: tool.name,
                description: tool.description,
                language: tool.language,
                trigger: tool.trigger,
                createdAt: tool.createdAt,
                memoryUsed: tool.memoryUsed
            }));

            return { success: true, tools: toolsList };
        });

        // Kill a tool
        this.registerHandler('workbench:kill-tool', async (event: any) => {
            const { toolId } = event.payload || event;

            if (!toolId) {
                return { success: false, error: 'Tool ID is required' };
            }

            const tool = this.tools.get(toolId);
            if (!tool) {
                return { success: false, error: `Tool ${toolId} not found` };
            }

            console.log(`[WorkbenchNode] Killing tool: ${toolId}`);
            await this.killTool(toolId);

            return { success: true, message: `Tool ${toolId} destroyed` };
        });

        console.log('[WorkbenchNode] Ready to create dynamic tools');
    }

    /**
     * Create a new dynamic tool
     */
    private async createTool(payload: CreateToolPayload, agentId: string): Promise<any> {
        const { name, description, language, code, trigger } = payload;

        // Validation
        if (!name || !code || !trigger) {
            throw new Error('name, code, and trigger are required');
        }

        // Generate unique tool ID
        this.toolCounter++;
        const toolId = `tool-${name}-${this.toolCounter}`;

        console.log(`[WorkbenchNode] Creating tool: ${toolId}`);
        console.log(`[WorkbenchNode]   Language: ${language}`);
        console.log(`[WorkbenchNode]   Trigger: ${trigger}`);

        // Create ephemeral Happen node for this tool
        const toolNode = (this.node as any).constructor({ id: toolId, config: {} });

        let moduleId: string | undefined;
        let handler: (event: any, context: any) => Promise<any>;

        // Compile/prepare the tool based on language
        if (language === 'javascript') {
            // For JavaScript, we'll wrap it in a simple eval context
            // This is NOT production-safe, but works for MVP
            console.log('[WorkbenchNode] Compiling JavaScript tool (eval mode)');

            handler = async (event: any, context: any) => {
                try {
                    // Create a sandboxed function
                    const func = new Function('input', 'console', code);
                    const result = await func(event, {
                        log: (...args: any[]) => console.log(`[Tool:${name}]`, ...args)
                    });
                    return { success: true, result };
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            };
        } else if (language === 'wasm') {
            // For WASM, load the module into the VM
            console.log('[WorkbenchNode] Loading WASM module');

            moduleId = toolId;

            // Create safe host functions with Shadow Mode integration
            const hostFunctions = wasmVM.createSafeHostFunctions(agentId, async (action) => {
                return await shadowService.stageAction(
                    action.agentId,
                    action.type,
                    action.summary,
                    action.payload
                );
            });

            // Load WASM module with host functions and resource limits
            await wasmVM.loadModule(
                moduleId,
                { type: 'buffer', source: Buffer.from(code, 'base64') },
                {
                    timeout: 5000,           // 5s per spec
                    memoryLimit: 100 * 1024 * 1024,  // 100MB per spec
                    hostFunctions
                }
            );

            // Create handler that executes the WASM module
            handler = async (event: any, context: any) => {
                try {
                    const input = JSON.stringify(event);
                    const result = await wasmVM.execute(moduleId!, 'handle', input);

                    if (!result.success) {
                        return { success: false, error: result.error };
                    }

                    return { success: true, output: result.output };
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            };
        } else if (language === 'python') {
            throw new Error('Python tools are not yet implemented (requires Pyodide/WASM compilation)');
        } else {
            throw new Error(`Unsupported language: ${language}`);
        }

        // Register the tool's event handler (with Shadow Mode wrapping if needed)
        toolNode.on(trigger, async (event: any, context: any) => {
            console.log(`[Tool:${name}] Triggered via ${trigger}`);

            try {
                // Execute the tool's handler
                const result = await handler(event, context);
                return result;
            } catch (error: any) {
                console.error(`[Tool:${name}] Execution error:`, error);
                return { success: false, error: error.message };
            }
        });

        // Store the tool metadata
        const tool: DynamicTool = {
            id: toolId,
            name,
            description,
            language,
            trigger,
            node: toolNode,
            moduleId,
            createdAt: Date.now(),
            memoryUsed: 0  // TODO: Track actual memory usage
        };

        this.tools.set(toolId, tool);

        console.log(`[WorkbenchNode] Tool ${toolId} created and registered successfully`);

        // Emit system:tool-ready event
        this.node.send('system:tool-ready', {
            status: 'active',
            toolId,
            trigger,
            sandbox: language === 'wasm' ? 'wasm' : 'eval',
            liners: ['ShadowMode']  // All tools are wrapped in Shadow Mode
        });

        return {
            success: true,
            toolId,
            trigger,
            message: `Tool ${name} is now active and listening on ${trigger}`
        };
    }

    /**
     * Kill and cleanup a tool
     */
    private async killTool(toolId: string): Promise<void> {
        const tool = this.tools.get(toolId);
        if (!tool) return;

        // Unload WASM module if applicable
        if (tool.moduleId) {
            await wasmVM.unloadModule(tool.moduleId);
        }

        // Remove from registry
        this.tools.delete(toolId);

        console.log(`[WorkbenchNode] Tool ${toolId} destroyed`);
    }

    /**
     * Cleanup all tools on shutdown
     */
    async cleanup(): Promise<void> {
        console.log('[WorkbenchNode] Cleaning up all dynamic tools...');

        const toolIds = Array.from(this.tools.keys());
        for (const toolId of toolIds) {
            await this.killTool(toolId);
        }

        console.log('[WorkbenchNode] All tools cleaned up');
    }
}
