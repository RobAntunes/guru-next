import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { connect, NatsConnection, JetStreamClient, KV } from 'nats';

export class NatsService {
    private process: ChildProcess | null = null;
    private port: number = 4222;
    private nc: NatsConnection | null = null;
    private js: JetStreamClient | null = null;

    constructor(port: number = 4222) {
        this.port = port;
    }

    public async start(): Promise<void> {
        if (this.process) {
            console.log('[NATS] Server already running');
            await this.connect();
            return;
        }

        const natsPath = await this.resolveNatsBinary();
        console.log(`[NATS] Starting server from: ${natsPath}`);

        await new Promise<void>((resolve, reject) => {
            this.process = spawn(natsPath, ['-p', this.port.toString(), '-js'], {
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });

            this.process.stdout?.on('data', (data) => {
                const msg = data.toString();
                // console.log(`[NATS] ${msg}`); // Verbose
                if (msg.includes('Server is ready')) {
                    resolve();
                }
            });

            this.process.stderr?.on('data', (data) => {
                console.error(`[NATS Error] ${data}`);
            });

            this.process.on('error', (err) => {
                console.error('[NATS] Failed to start:', err);
                reject(err);
            });

            this.process.on('close', (code) => {
                console.log(`[NATS] Server exited with code ${code}`);
                this.process = null;
                this.nc = null;
                this.js = null;
            });

            // Fallback: Resolve after 1s if "Server is ready" isn't caught (sometimes buffering hides it)
            setTimeout(() => resolve(), 1000);
        });

        await this.connect();
    }

    private async connect(): Promise<void> {
        if (this.nc) return;

        try {
            console.log('[NATS] Connecting system client...');
            this.nc = await connect({ servers: `localhost:${this.port}` });
            this.js = this.nc.jetstream();
            console.log('[NATS] System client connected');
        } catch (error) {
            console.error('[NATS] Failed to connect system client:', error);
            // Don't throw, as the server might still be running fine for other clients
        }
    }

    public async getSwarmStateBucket(): Promise<KV> {
        if (!this.nc || !this.js) {
            await this.connect();
        }

        if (!this.js) {
            throw new Error('NATS JetStream not available');
        }

        // Create 'swarm_state' bucket with history for debugging
        return await this.js.views.kv('swarm_state', { history: 5 });
    }

    public async stop(): Promise<void> {
        if (this.nc) {
            console.log('[NATS] Closing system client...');
            await this.nc.close();
            this.nc = null;
            this.js = null;
        }

        if (this.process) {
            console.log('[NATS] Stopping server...');
            this.process.kill();
            this.process = null;
        }
    }

    private async resolveNatsBinary(): Promise<string> {
        // 1. Development: Look in node_modules
        // 2. Production: Look in resources/bin (we need to configure electron-builder for this)

        let binaryName = process.platform === 'win32' ? 'nats-server.exe' : 'nats-server';

        // Check dev path
        const devPath = path.join(process.cwd(), 'node_modules', '.bin', binaryName);
        if (fs.existsSync(devPath)) {
            return devPath;
        }

        // Check direct package path (sometimes .bin is a symlink that fails in some contexts)
        const packagePath = path.join(process.cwd(), 'node_modules', 'nats-server', 'bin', binaryName);
        if (fs.existsSync(packagePath)) {
            return packagePath;
        }

        // Check local resources/bin (Development)
        const localResourcesPath = path.join(process.cwd(), 'resources', 'bin', binaryName);
        if (fs.existsSync(localResourcesPath)) {
            return localResourcesPath;
        }

        // Production path (standard electron resources)
        let prodPath: string | undefined;
        if (process.resourcesPath) {
            prodPath = path.join(process.resourcesPath, 'bin', binaryName);
            if (fs.existsSync(prodPath)) {
                return prodPath;
            }
        }

        throw new Error(`Could not find nats-server binary. Searched: ${devPath}, ${packagePath}${prodPath ? `, ${prodPath}` : ''}`);
    }
}

export const natsService = new NatsService();
