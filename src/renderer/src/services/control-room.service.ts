import { Agent, ControlRoomMetrics, SystemLog } from "../types/control-room";

type Listener<T> = (data: T) => void;

class ControlRoomService {
    private metricsListeners: Listener<ControlRoomMetrics>[] = [];
    private logsListeners: Listener<SystemLog>[] = [];

    private metrics: ControlRoomMetrics = {
        activeAgents: 12,
        eventsPerMinute: 124,
        openIncidents: 2,
        latency: 12,
        isSystemOnline: true
    };

    constructor() {
        this.startSimulation();
    }

    private startSimulation() {
        // Simulate Heartbeat & Metrics updates
        setInterval(() => {
            this.metrics = {
                ...this.metrics,
                eventsPerMinute: 100 + Math.floor(Math.random() * 50),
                latency: 10 + Math.floor(Math.random() * 5),
                activeAgents: 10 + Math.floor(Math.random() * 5)
            };
            this.notifyMetrics();
        }, 2000);

        // Simulate Random Logs
        setInterval(() => {
            if (Math.random() > 0.7) {
                this.emitRandomLog();
            }
        }, 3000);
    }

    private emitRandomLog() {
        const sources = ['Network', 'FileSystem', 'AgentSwarm', 'Governance'];
        const levels: SystemLog['level'][] = ['INFO', 'INFO', 'INFO', 'WARN', 'SUCCESS'];
        const messages = [
            'Packet latency increased',
            'File write operation completed',
            'Agent started new task',
            'Memory usage optimization',
            'Cache invalidated',
            'Policy check passed',
            'Uplink established'
        ];

        const log: SystemLog = {
            id: `LOG-${Date.now().toString().slice(-4)}`,
            level: levels[Math.floor(Math.random() * levels.length)],
            message: messages[Math.floor(Math.random() * messages.length)],
            source: sources[Math.floor(Math.random() * sources.length)],
            timestamp: Date.now()
        };

        this.logsListeners.forEach(l => l(log));
    }

    public subscribeToMetrics(listener: Listener<ControlRoomMetrics>) {
        this.metricsListeners.push(listener);
        listener(this.metrics); // Initial emit
        return () => {
            this.metricsListeners = this.metricsListeners.filter(l => l !== listener);
        };
    }

    public subscribeToLogs(listener: Listener<SystemLog>) {
        this.logsListeners.push(listener);
        return () => {
            this.logsListeners = this.logsListeners.filter(l => l !== listener);
        };
    }

    private notifyMetrics() {
        this.metricsListeners.forEach(l => l(this.metrics));
    }
}

export const controlRoomService = new ControlRoomService();
