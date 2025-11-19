import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class NatsService {
    private process: ChildProcess | null = null;
    private port: number = 4222;

    constructor(port: number = 4222) {
        this.port = port;
    }

    public async start(): Promise<void> {
        if (this.process) {
            console.log('[NATS] Server already running');
            return;
        }

        const natsPath = await this.resolveNatsBinary();
        console.log(`[NATS] Starting server from: ${natsPath}`);

        return new Promise((resolve, reject) => {
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
            });

            // Fallback: Resolve after 1s if "Server is ready" isn't caught (sometimes buffering hides it)
            setTimeout(() => resolve(), 1000);
        });
    }

    public stop(): void {
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
