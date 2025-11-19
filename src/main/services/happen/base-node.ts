import { HappenNode } from 'happen-core';
import { shadowService } from './shadow-service';

export abstract class BaseServiceNode {
    protected node: HappenNode;
    protected name: string;

    constructor(node: HappenNode, name: string) {
        this.node = node;
        this.name = name;
        this.initialize();
    }

    protected abstract initialize(): void;

    protected registerHandler(topic: string, handler: (event: any, context: any) => Promise<any>) {
        this.node.on(topic, async (event, context) => {
            try {
                console.log(`[${this.name}] Handling ${topic}`);
                const result = await handler(event, context);
                return result;
            } catch (error: any) {
                console.error(`[${this.name}] Error handling ${topic}:`, error);
                return { success: false, error: error.message };
            }
        });
    }

    /**
     * Helper to check if operation should be intercepted by Shadow Mode.
     * If Shadow Mode is on, it stages the action and throws a special "Staged" response 
     * or returns a structured object indicating staging.
     */
    protected async executeSafely(
        agentId: string,
        type: 'fs:write' | 'fs:delete' | 'terminal:exec',
        summary: string,
        payload: any,
        operation: () => Promise<any>
    ): Promise<any> {
        if (shadowService.isShadowMode()) {
            return await shadowService.stageAction(agentId, type, summary, payload);
        }

        // Direct execution if Shadow Mode is off
        return await operation();
    }
}
