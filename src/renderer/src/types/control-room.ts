export type AgentStatus = 'idle' | 'working' | 'paused' | 'error';

export interface Agent {
    id: string;
    name: string; // e.g., "RefactorAgent-01"
    role?: string; // e.g., "architect", "coder"
    task: string; // e.g., "Refactoring auth.ts"
    status: AgentStatus;
    progress?: number; // 0-100
    lastActive?: number;
    swarmId?: string;
}

export interface Incident {
    id: string; // e.g., "INC-123"
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    timestamp: number;
    status: 'open' | 'resolved';
}

export interface SystemLog {
    id: string;
    level: 'INFO' | 'WARN' | 'ERR' | 'SUCCESS';
    message: string;
    source: string; // e.g., "Network", "FileSystem"
    timestamp: number;
}

export interface ControlRoomMetrics {
    activeAgents: number;
    eventsPerMinute: number;
    openIncidents: number;
    latency: number;
    isSystemOnline: boolean;
}

export interface ThoughtStep {
    id: string;
    type: 'status' | 'tool_call' | 'tool_result' | 'error';
    content: string;
    timestamp: number;
    metadata?: any;
}

export interface ChatMessage {
    id: string;
    agentId: string | 'user';
    text: string;
    timestamp: number;
    type: 'text' | 'code' | 'log';
    metadata?: {
        language?: string;
        filePath?: string;
    };
    thoughtProcess?: ThoughtStep[];
    isThinking?: boolean;
}
