import { BaseServiceNode } from '../base-node';
import { readFileContent, getDirectoryFiles } from '../../../file-handlers';
import { writeFile } from 'fs/promises';
import { basename } from 'path';

export class FileSystemNode extends BaseServiceNode {
    constructor(node: any) {
        super(node, 'FileSystemNode');
    }

    protected initialize(): void {
        // Read File
        this.registerHandler('fs:read', async (event: any) => {
            const { path } = event;
            if (!path) throw new Error('Path is required');

            const content = await readFileContent(path);
            return { success: true, content };
        });

        // List Directory
        this.registerHandler('fs:list', async (event: any) => {
            const { path, recursive } = event;
            if (!path) throw new Error('Path is required');

            const files = await getDirectoryFiles(path, recursive || false);
            return { success: true, files };
        });

        // Write File (Protected by Shadow Mode)
        this.registerHandler('fs:write', async (event: any, context: any) => {
            const { path, content } = event;
            // Extract agentId from context or event if available, defaulting to 'unknown'
            // In Happen core, context usually contains sender info
            const agentId = context?.sender || event.agentId || 'unknown';

            if (!path) throw new Error('Path is required');
            if (content === undefined) throw new Error('Content is required');

            const summary = `Write ${content.length} bytes to ${basename(path)}`;
            
            return await this.executeSafely(
                agentId,
                'fs:write',
                summary,
                { path, content },
                async () => {
                    await writeFile(path, content, 'utf-8');
                    return { success: true, path };
                }
            );
        });
    }
}
