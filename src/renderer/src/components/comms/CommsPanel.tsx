import React, { useState, useEffect } from 'react';
import { ChatFeed } from '../chat/ChatFeed';
import { ChatInput } from '../chat/ChatInput';
import { Agent, ChatMessage } from '../../types/control-room';
import { chatService } from '../../services/chat.service';
import { chatHistoryStorage } from '../../services/chat-history-storage';
import { happenService } from '../../services/happen-service';
import { AISettings } from '../settings/AISettings';
import { ShadowPanel } from '../workbench/ShadowPanel';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, Cpu, Maximize2, Minimize2, X, ChevronLeft, Shield, Clock, Trash2, History } from 'lucide-react';
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
    const [activeView, setActiveView] = useState<'chat' | 'shadow' | 'history'>('chat');
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [selectedSwarmId, setSelectedSwarmId] = useState<string>('swarm-alpha');
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Shadow Mode State
    const [pendingShadowCount, setPendingShadowCount] = useState(0);

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
        // Load initial history if available
        const init = async () => {
            const history = await chatHistoryStorage.loadHistory();
            if (history.length > 0) {
                setMessages(history);
            } else {
                setMessages([
                    {
                        id: '1',
                        agentId: 'system',
                        text: 'Guru AI Mission Control initialized. Context Graph loaded. Ready for instructions.',
                        timestamp: Date.now(),
                        type: 'log'
                    }
                ]);
            }
        };
        init();

        loadProviders();
        checkShadowStatus();

        // Subscribe to shadow updates to show badge
        const unsubscribe = happenService.onShadowUpdate((actions) => {
            setPendingShadowCount(actions.length);
        });

        return () => unsubscribe();
    }, []);

    // Auto-save history on changes
    useEffect(() => {
        if (messages.length > 0) {
            const timeout = setTimeout(() => {
                chatHistoryStorage.saveHistory(messages);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [messages]);

    const checkShadowStatus = async () => {
        const actions = await happenService.getPendingShadowActions();
        setPendingShadowCount(actions.length);
    };

    const loadProviders = async () => {
        try {
            // @ts-ignore
            if (!window.api?.aiProvider?.list) {
                console.warn('AI Providers API not available yet');
                return;
            }

            // @ts-ignore
            const result = await window.api.aiProvider.list();
            if (result.success) {
                const list = result.data;
                setProviders(list);

                // Set default if not set
                const configured = list.filter((p: any) => p.isConfigured);
                if (configured.length > 0) {
                    // Default to first model of first configured provider
                    const p = configured[0];
                    if (p.models.length > 0) {
                        setSelectedModel(`${p.id}:${p.models[0]}`);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load AI providers:', error);
        }
    };

    const handleClearHistory = async () => {
        if (confirm('Are you sure you want to clear all chat history?')) {
            await chatHistoryStorage.clearHistory();
            setMessages([{
                id: Date.now().toString(),
                agentId: 'system',
                text: 'History cleared.',
                timestamp: Date.now(),
                type: 'log'
            }]);
        }
    };

    const handleSend = async (messageText?: string) => {
        const textToSend = messageText || inputValue;
        if (!textToSend.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            agentId: 'user',
            text: textToSend,
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
                    console.log('[CommsPanel] Received stream update:', update.type, update.data);
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const msgIndex = newMessages.findIndex(m => m.id === botMsgId);
                        if (msgIndex === -1) return prev;

                        const currentMsg = { ...newMessages[msgIndex] };
                        const currentThoughts = [...(currentMsg.thoughtProcess || [])];

                        switch (update.type) {
                            case 'status':
                                currentThoughts.push({
                                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    type: 'status',
                                    content: update.data.status,
                                    timestamp: Date.now()
                                });
                                break;

                            case 'tool_call':
                                const toolNames = update.data.tools.map((t: any) => t.name).join(', ');
                                currentThoughts.push({
                                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    type: 'tool_call',
                                    content: `Calling tools: ${toolNames}`,
                                    timestamp: Date.now(),
                                    metadata: update.data
                                });
                                break;

                            case 'tool_result':
                                const { tool, success, error } = update.data;
                                // Find the last status step that matches "Executing {tool}..."
                                const matchingStatusIndex = currentThoughts.map(t => t.content).lastIndexOf(`Executing ${tool}...`);

                                if (matchingStatusIndex !== -1) {
                                    // Update the existing step
                                    currentThoughts[matchingStatusIndex] = {
                                        ...currentThoughts[matchingStatusIndex],
                                        type: 'tool_result',
                                        content: success ? `Tool '${tool}' completed` : `Tool '${tool}' failed: ${error}`,
                                        metadata: update.data
                                    };
                                } else {
                                    // Fallback: add new step if not found
                                    currentThoughts.push({
                                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                        type: 'tool_result',
                                        content: success ? `Tool '${tool}' completed` : `Tool '${tool}' failed: ${error}`,
                                        timestamp: Date.now(),
                                        metadata: update.data
                                    });
                                }
                                break;

                            case 'response':
                                let responseText = '';
                                if (typeof update.data === 'string') {
                                    responseText = update.data;
                                } else {
                                    // Check if response property exists, even if empty string
                                    if (typeof update.data.response === 'string') {
                                        responseText = update.data.response;
                                    } else {
                                        responseText = JSON.stringify(update.data);
                                    }
                                }

                                currentMsg.text = responseText;
                                break;

                            case 'error':
                                currentThoughts.push({
                                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    type: 'error',
                                    content: update.data.message,
                                    timestamp: Date.now()
                                });
                                currentMsg.text = `Error: ${update.data.message}`;
                                break;
                        }

                        currentMsg.thoughtProcess = currentThoughts;
                        newMessages[msgIndex] = currentMsg;
                        return newMessages;
                    });
                }
            );

            // Ensure thinking is turned off when stream completes
            setMessages(prev => {
                const newMessages = [...prev];
                const msgIndex = newMessages.findIndex(m => m.id === botMsgId);
                if (msgIndex !== -1) {
                    newMessages[msgIndex] = {
                        ...newMessages[msgIndex],
                        isThinking: false
                    };
                }
                return newMessages;
            });
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
                            <span className={cn("text-xs font-medium",
                                activeView === 'shadow' ? "text-yellow-500" :
                                    activeView === 'history' ? "text-purple-500" :
                                        (selectedAgentId ? "text-primary" : "text-green-500"))}>
                                {activeView === 'shadow' ? 'SHADOW PROTOCOL' :
                                    activeView === 'history' ? 'HISTORY LOGS' :
                                        (selectedAgentId ? activeAgents.find(a => a.id === selectedAgentId)?.name : 'Broadcast All')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Model Switcher */}
                    {mode !== 'compact' && activeView === 'chat' && (
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
                                        {provider.models.map((model: string) => (
                                            <SelectItem
                                                key={model}
                                                value={`${provider.id}:${model}`}
                                                disabled={!provider.isConfigured}
                                                className="text-[10px] font-mono pl-4"
                                            >
                                                {model}
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
                    <div className="w-[60px] border-r border-border bg-muted/10 flex flex-col items-center py-4 gap-4 shrink-0">
                        {/* Swarm Broadcast Button */}
                        <button
                            onClick={() => {
                                setActiveView('chat');
                                setSelectedAgentId(null);
                            }}
                            className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
                                activeView === 'chat' && !selectedAgentId
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
                                onClick={() => {
                                    setActiveView('chat');
                                    setSelectedAgentId(agent.id);
                                }}
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group",
                                    activeView === 'chat' && selectedAgentId === agent.id
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

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* History Toggle */}
                        <button
                            onClick={() => setActiveView(prev => prev === 'history' ? 'chat' : 'history')}
                            className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 mb-2",
                                activeView === 'history'
                                    ? "bg-purple-500/20 text-purple-500 border-purple-500/50"
                                    : "bg-secondary/50 hover:bg-accent text-muted-foreground hover:text-foreground border border-border"
                            )}
                            title="History Logs"
                        >
                            <History className="w-5 h-5" />
                        </button>

                        {/* Shadow Mode Toggle */}
                        <div className="relative mb-2">
                            <button
                                onClick={() => setActiveView(prev => prev === 'shadow' ? 'chat' : 'shadow')}
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative",
                                    activeView === 'shadow'
                                        ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50"
                                        : "bg-secondary/50 hover:bg-accent text-muted-foreground hover:text-foreground border border-border"
                                )}
                                title="Shadow Protocol Interceptor"
                            >
                                <Shield className="w-5 h-5" />
                            </button>
                            {pendingShadowCount > 0 && (
                                <div className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background animate-bounce">
                                    {pendingShadowCount}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Main View */}
                <div className="flex-1 flex flex-col min-w-0 bg-background relative">
                    {activeView === 'chat' ? (
                        <>
                            <ChatFeed
                                messages={messages}
                            />
                            <ChatInput
                                onSend={(text, attachments) => {
                                    handleSend(text);
                                }}
                                onClear={handleClearHistory}
                                agentId={selectedAgentId || undefined}
                            />
                        </>
                    ) : activeView === 'shadow' ? (
                        <ShadowPanel />
                    ) : (
                        <div className="flex-1 flex flex-col bg-background">
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold flex items-center">
                                        <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
                                        Chat History
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {messages.length} messages stored in local history
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleClearHistory}
                                    className="flex items-center text-xs"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Clear History
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Currently viewing the active session.</p>
                                    <p className="text-xs mt-2 opacity-70">Switch back to Chat to continue conversation.</p>
                                </div>
                                {/* We could render a list of past sessions here if we structured storage that way */}
                            </div>
                        </div>
                    )}
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
