import { BaseServiceNode } from '../base-node';

export class NetNode extends BaseServiceNode {
    constructor(node: any) {
        super(node, 'NetNode');
    }

    protected initialize(): void {
        // HTTP Request
        this.registerHandler('net:request', async (event: any) => {
            const { url, method = 'GET', headers = {}, body } = event;
            if (!url) throw new Error('URL is required');

            try {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    body: body ? JSON.stringify(body) : undefined
                });

                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text;
                }

                return {
                    success: true,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    data
                };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        });
    }
}
