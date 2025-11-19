import { BaseServiceNode } from '../base-node';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class TerminalNode extends BaseServiceNode {
    constructor(node: any) {
        super(node, 'TerminalNode');
    }

    protected initialize(): void {
        // Execute Command (Protected by Shadow Mode)
        this.registerHandler('terminal:exec', async (event: any, context: any) => {
            const { command, cwd } = event;
            const agentId = context?.sender || event.agentId || 'unknown';

            if (!command) throw new Error('Command is required');

            const summary = `Execute: ${command.length > 50 ? command.substring(0, 47) + '...' : command}`;

            return await this.executeSafely(
                agentId,
                'terminal:exec',
                summary,
                { command, cwd },
                async () => {
                    try {
                        const { stdout, stderr } = await execAsync(command, { cwd: cwd || process.cwd() });
                        return { 
                            success: true, 
                            stdout: stdout.trim(), 
                            stderr: stderr.trim() 
                        };
                    } catch (error: any) {
                        return { 
                            success: false, 
                            error: error.message,
                            stdout: error.stdout,
                            stderr: error.stderr
                        };
                    }
                }
            );
        });
    }
}
