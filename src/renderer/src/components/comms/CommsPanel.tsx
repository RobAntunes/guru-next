import React, { useState, useEffect } from 'react';
import { AgentRoster } from '../chat/AgentRoster';
import { ChatFeed } from '../chat/ChatFeed';
import { Agent, ChatMessage } from '../../types/control-room';
import { chatService } from '../../services/chat.service';
import { AISettings } from '../settings/AISettings';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, Cpu, Maximize2, Minimize2, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type CommsMode = 'hidden' | 'compact' | 'sidebar' | 'full';

interface Swarm {
    id: string;
    name: string;
    color: string;
    description: string;
}

interface CommsPanelProps {
    mode: CommsMode;
    onModeChange: (mode: CommsMode) => void;
}

export const CommsPanel: React.FC<CommsPanelProps> = ({ mode, onModeChange }) => {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [selectedSwarmId, setSelectedSwarmId] = useState<string>('swarm-alpha');
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Mock Swarms
    const swarms: Swarm[] = [
        { id: 'swarm-alpha', name: 'Alpha Squad', color: 'bg-blue-500', description: 'Core Development Team' },
        { id: 'swarm-beta', name: 'Beta Ops', color: 'bg-orange-500', description: 'DevOps & Infrastructure' },
        { id: 'swarm-gamma', name: 'Gamma Ray', color: 'bg-purple-500', description: 'Research & Data Science' }
    ];

    // Mock Agents with Swarm assignment
    const allAgents: (Agent & { swarmId: string })[] = [
        // Alpha
        { id: 'ARCHITECT-01', name: 'System Architect', role: 'architect', status: 'idle', task: 'Idle', lastActive: Date.now(), swarmId: 'swarm-alpha' },
        { id: 'CODER-ALPHA', name: 'Lead Developer', role: 'coder', status: 'idle', task: 'Idle', lastActive: Date.now(), swarmId: 'swarm-alpha' },
        { id: 'QA-BOT', name: 'QA Engineer', role: 'qa', status: 'idle', task: 'Idle', lastActive: Date.now(), swarmId: 'swarm-alpha' },
        // Beta
        { id: 'OPS-LEAD', name: 'Ops Commander', role: 'architect', status: 'working', task: 'Monitoring', lastActive: Date.now(), swarmId: 'swarm-beta' },
        { id: 'SEC-BOT', name: 'Security Sentinel', role: 'qa', status: 'idle', task: 'Scanning', lastActive: Date.now(), swarmId: 'swarm-beta' },
        // Gamma
        { id: 'DATA-MIND', name: 'Data Scientist', role: 'coder', status: 'idle', task: 'Training', lastActive: Date.now(), swarmId: 'swarm-gamma' },
    ];

    const activeAgents = allAgents.filter(a => a.swarmId === selectedSwarmId);
    const activeSwarm = swarms.find(s => s.id === selectedSwarmId);

    // Model Selection State
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');

    useEffect(() => {
        // Load initial welcome message
        setMessages([
            {
                id: '1',
                agentId: 'system',
                text: 'Guru AI Mission Control initialized. Context Graph loaded. Ready for instructions.',
                timestamp: Date.now(),
                type: 'log'
            }
        ]);

        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            // @ts-ignore
            if (!window.api?.ai?.getProviders) {
                console.warn('AI Providers API not available yet');
                return;
            }

            // @ts-ignore
            const list = await window.api.ai.getProviders();
            setProviders(list);

            // Set default if not set
            const configured = list.filter((p: any) => p.isConfigured);
            if (configured.length > 0) {
                // Default to first model of first configured provider
                const p = configured[0];
                if (p.models.length > 0) {
                    setSelectedModel(`${p.id}:${p.models[0].id}`);
                }
            }
        } catch (error) {
            console.error('Failed to load AI providers:', error);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            agentId: 'user',
            text: inputValue,
            timestamp: Date.now(),
            type: 'text'
        };

        // Add user message and a placeholder for the bot's thinking state
        const botMsgId = (Date.now() + 1).toString();
        const initialBotMsg: ChatMessage = {
            id: botMsgId,
            agentId: selectedAgentId || 'system',
            text: '',
            timestamp: Date.now(),
            type: 'text',
            isThinking: true,
            thoughtProcess: []
        };

        setMessages(prev => [...prev, userMsg, initialBotMsg]);
        setInputValue('');

        const targetAgentId = selectedAgentId || 'SWARM_ALL';

        try {
            const [providerId, modelId] = selectedModel.split(':');

            await chatService.sendStreamMessage(
                userMsg.text,
                targetAgentId,
                { providerId, modelId },
                (update) => {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const msgIndex = newMessages.findIndex(m => m.id === botMsgId);
                        if (msgIndex === -1) return prev;

                        const currentMsg = { ...newMessages[msgIndex] };
                        const currentThoughts = [...(currentMsg.thoughtProcess || [])];

                        switch (update.type) {
                            case 'status':
                                currentThoughts.push({
                                    id: Date.now().toString(),
                                    type: 'status',
                                    content: update.data.status,
                                    timestamp: Date.now()
                                });
                                break;

                            case 'tool_call':
                                const toolNames = update.data.tools.map((t: any) => t.name).join(', ');
                                currentThoughts.push({
                                    id: Date.now().toString(),
                                    type: 'tool_call',
                                    content: `Calling tools: ${toolNames}`,
                                    timestamp: Date.now(),
                                    metadata: update.data
                                });
                                break;

                            case 'tool_result':
                                const { tool, success, error } = update.data;
                                currentThoughts.push({
                                    id: Date.now().toString(),
                                    type: 'tool_result',
                                    content: success ? `Tool '${tool}' completed` : `Tool '${tool}' failed: ${error}`,
                                    timestamp: Date.now(),
                                    metadata: update.data
                                });
                                break;

                            case 'response':
                                const responseText = typeof update.data === 'string'
                                    ? update.data
                                    : update.data.response || JSON.stringify(update.data);

                                currentMsg.text = responseText;
                                currentMsg.isThinking = false;
                                break;

                            case 'error':
                                currentThoughts.push({
                                    id: Date.now().toString(),
                                    type: 'error',
                                    content: update.data.message,
                                    timestamp: Date.now()
                                });
                                currentMsg.isThinking = false;
                                currentMsg.text = `Error: ${update.data.message}`;
                                break;
                        }

                        currentMsg.thoughtProcess = currentThoughts;
                        newMessages[msgIndex] = currentMsg;
                        return newMessages;
                    });
                }
            );
        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages(prev => {
                const newMessages = [...prev];
                const msgIndex = newMessages.findIndex(m => m.id === botMsgId);
                if (msgIndex !== -1) {
                    newMessages[msgIndex] = {
                        ...newMessages[msgIndex],
                        isThinking: false,
                        text: `Error: ${error.message}`,
                        type: 'log'
                    };
                }
                return newMessages;
            });
        }
    };

    if (mode === 'hidden') return null;

    return (
        <div
            className={cn(
                "fixed z-50 border-l border-border bg-[#111111] shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
                mode === 'full' && "inset-0 left-[60px]", // Full screen (minus sidebar)
                mode === 'sidebar' && "top-0 right-0 bottom-0 w-[50vw]", // Docked sidebar (50% width)
                mode === 'compact' && "bottom-4 right-4 w-[400px] h-[600px] rounded-lg border" // Floating compact
            )}
        >
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-muted/30 shrink-0">
                <div className="flex items-center gap-3">
                    {/* Swarm Selector */}
                    <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Active Swarm</span>
                        <Select value={selectedSwarmId} onValueChange={setSelectedSwarmId}>
                            <SelectTrigger className="h-6 w-[140px] text-xs font-bold border-none bg-transparent p-0 hover:bg-accent/50 focus:ring-0">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", activeSwarm?.color)} />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {swarms.map(swarm => (
                                    <SelectItem key={swarm.id} value={swarm.id} className="text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", swarm.color)} />
                                            {swarm.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-8 w-px bg-border mx-1" />

                    {/* Channel Indicator */}
                    <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Target</span>
                        <div className="flex items-center gap-2 h-6">
                            <span className={cn("text-xs font-medium", selectedAgentId ? "text-primary" : "text-green-500")}>
                                {selectedAgentId ? activeAgents.find(a => a.id === selectedAgentId)?.name : 'Broadcast All'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Model Switcher */}
                    {mode !== 'compact' && (
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger className="w-[160px] h-7 text-[10px] font-mono bg-secondary/50 border-border">
                                <Cpu className="w-3 h-3 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Select Model" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                                {providers.map((provider: any) => (
                                    <div key={provider.id}>
                                        <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50">
                                            {provider.name}
                                        </div>
                                        {provider.models.map((model: any) => (
                                            <SelectItem
                                                key={model.id}
                                                value={`${provider.id}:${model.id}`}
                                                disabled={!provider.isConfigured}
                                                className="text-[10px] font-mono pl-4"
                                            >
                                                {model.name}
                                            </SelectItem>
                                        ))}
                                    </div>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Settings */}
                    {mode !== 'compact' && (
                        <Dialog onOpenChange={(open) => { if (!open) loadProviders(); }}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Settings className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] bg-background border-border">
                                <DialogHeader>
                                    <DialogTitle>AI Provider Settings</DialogTitle>
                                </DialogHeader>
                                <AISettings />
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Window Controls */}
                    <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
                        {mode === 'compact' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onModeChange('sidebar')}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        )}
                        {mode === 'sidebar' && (
                            <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onModeChange('compact')}>
                                    <Minimize2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onModeChange('full')}>
                                    <Maximize2 className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                        {mode === 'full' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onModeChange('sidebar')}>
                                <Minimize2 className="w-4 h-4" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive" onClick={() => onModeChange('hidden')}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Rail: Agent Selector (Visible in Sidebar/Full) */}
                {mode !== 'compact' && (
                    <div className="w-[60px] border-r border-border bg-muted/10 flex flex-col items-center py-4 gap-4">
                        {/* Swarm Broadcast Button */}
                        <button
                            onClick={() => setSelectedAgentId(null)}
                            className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                                !selectedAgentId
                                    ? cn(activeSwarm?.color, "text-white shadow-lg shadow-white/10")
                                    : "bg-secondary/50 hover:bg-accent text-muted-foreground hover:text-foreground border border-border"
                            )}
                            title={`Broadcast to ${activeSwarm?.name}`}
                        >
                            <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                                <div className="bg-current rounded-full" />
                                <div className="bg-current rounded-full" />
                                <div className="bg-current rounded-full" />
                                <div className="bg-current rounded-full" />
                            </div>
                        </button>

                        <div className="w-8 h-px bg-border" />

                        {/* Agent List */}
                        {activeAgents.map(agent => (
                            <button
                                key={agent.id}
                                onClick={() => setSelectedAgentId(agent.id)}
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
                                    selectedAgentId === agent.id
                                        ? "bg-primary text-primary-foreground shadow-lg"
                                        : "bg-secondary/50 hover:bg-accent text-muted-foreground hover:text-foreground border border-border"
                                )}
                                title={agent.name}
                            >
                                <span className="font-mono text-xs font-bold">
                                    {agent.name.substring(0, 2).toUpperCase()}
                                </span>
                                {agent.status === 'working' && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Chat Feed */}
                <div className="flex-1 flex flex-col min-w-0 bg-background">
                    <ChatFeed
                        messages={messages}
                        inputValue={inputValue}
                        onInputChange={setInputValue}
                        onSend={handleSend}
                    />
                </div>

                {/* Context Panel (Only in Full Mode) */}
                {mode === 'full' && (
                    <div className="w-[400px] border-l border-border bg-muted/10 p-4 hidden xl:block">
                        <div className="h-full rounded-lg border border-border border-dashed flex items-center justify-center text-muted-foreground text-sm">
                            Context Graph Visualization
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
