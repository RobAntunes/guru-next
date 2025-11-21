import React, { useState, useEffect, useRef } from 'react';
import { AgentRoster } from '../components/chat/AgentRoster';
import { ChatFeed } from '../components/chat/ChatFeed';
import { Agent, ChatMessage, ThoughtStep } from '../types/control-room';
import { chatService } from '../services/chat.service';
import { chatHistoryStorage } from '../services/chat-history-storage';
import { ChatInput, Attachment } from '../components/chat/ChatInput';
import { happenService, AgentState } from '../services/happen-service';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ChatPage = () => {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [agents, setAgents] = useState<AgentState[]>([]);
    const [agentsWaitingForApproval, setAgentsWaitingForApproval] = useState<AgentState[]>([]);

    // Model Selection State
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('local:gpt2');
    const [isProcessing, setIsProcessing] = useState(false);

    // Ref to track if initial load is done to avoid overwriting history with empty array
    const initialLoadDone = useRef(false);

    useEffect(() => {
        const init = async () => {
            // Load history
            const history = await chatHistoryStorage.loadHistory();

            if (history.length > 0) {
                setMessages(history);
            } else {
                // Load initial welcome message if no history
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

            initialLoadDone.current = true;
            loadProviders();
            fetchAgents();
        };

        init();

        // Poll for agent status
        const interval = setInterval(fetchAgents, 2000);
        return () => clearInterval(interval);
    }, []);

    const fetchAgents = async () => {
        try {
            const agentStates = await happenService.listAgents();
            if (agentStates.length > 0) {
                setAgents(agentStates);
                setAgentsWaitingForApproval(agentStates.filter(a => a.status === 'waiting_approval'));
            } else {
                // Fallback if no agents running yet
                setAgents([
                    { id: 'architect', name: 'System Architect', role: 'architect', status: 'idle', tools: [] },
                    { id: 'coder', name: 'Lead Developer', role: 'coder', status: 'idle', tools: [] },
                    { id: 'qa', name: 'QA Engineer', role: 'qa', status: 'idle', tools: [] }
                ]);
                setAgentsWaitingForApproval([]);
            }
        } catch (e) {
            console.error("Failed to fetch agents", e);
        }
    };

    // Save history whenever messages change
    useEffect(() => {
        if (initialLoadDone.current && messages.length > 0) {
            const saveTimer = setTimeout(() => {
                chatHistoryStorage.saveHistory(messages);
            }, 1000); // Debounce save

            return () => clearTimeout(saveTimer);
        }
    }, [messages]);

    const loadProviders = async () => {
        // @ts-ignore
        if (window.api?.aiProvider?.list) {
            // @ts-ignore
            const result = await window.api.aiProvider.list();
            if (result.success) {
                const list = result.data;
                setProviders(list);

                // Set default if not set (prefer Claude or GPT if available)
                const configured = list.filter((p: any) => p.isConfigured && p.id !== 'local');
                if (configured.length > 0) {
                    // Default to first model of first configured provider
                    const p = configured[0];
                    if (p.models.length > 0) {
                        setSelectedModel(`${p.id}:${p.models[0]}`);
                    }
                }
            }
        }
    };

    const handleSend = async (text: string, attachments: Attachment[]) => {
        const msgId = Date.now().toString();
        const userMsg: ChatMessage = {
            id: msgId,
            agentId: 'user',
            text: text,
            timestamp: Date.now(),
            type: 'text'
        };

        // Append attachments info to UI message
        let fullText = text;
        if (attachments.length > 0) {
            fullText += '\n\n--- Attached Context ---\n';
            attachments.forEach(att => {
                fullText += `[File: ${att.name}]\n`;
            });
        }
        userMsg.text = fullText;

        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);

        // Set local status to working (will be overwritten by poller eventually)
        const targetAgentId = selectedAgentId || 'architect'; 
        
        // Prepare actual prompt with full content of attachments
        let promptWithContext = text;
        if (attachments.length > 0) {
            promptWithContext += '\n\n[USER ATTACHED CONTEXT]\n';
            attachments.forEach(att => {
                if (att.type === 'file') {
                    promptWithContext += `\nFile: ${att.name}\nPath: ${att.value}\nContent:\n\`\`\`\n${att.content}\n\`\`\`\n`;
                }
            });
        }

        const [providerId, modelId] = selectedModel.split(':');
        const responseId = (Date.now() + 1).toString();
        
        // Create placeholder response message
        const initialResponseMsg: ChatMessage = {
            id: responseId,
            agentId: targetAgentId,
            text: '',
            timestamp: Date.now(),
            type: 'text',
            isThinking: true,
            thoughtProcess: []
        };
        
        setMessages(prev => [...prev, initialResponseMsg]);

        try {
            await chatService.sendStreamMessage(
                promptWithContext, 
                targetAgentId, 
                { providerId, modelId },
                (update) => {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const msgIndex = newMessages.findIndex(m => m.id === responseId);
                        if (msgIndex === -1) return prev;

                        const msg = { ...newMessages[msgIndex] };
                        
                        // Handle different update types
                        switch (update.type) {
                            case 'status':
                                // Add status as a thought step
                                const statusStep: ThoughtStep = {
                                    id: `step-${Date.now()}-${Math.random()}`,
                                    type: 'status',
                                    content: update.data.status,
                                    timestamp: Date.now()
                                };
                                msg.thoughtProcess = [...(msg.thoughtProcess || []), statusStep];
                                break;
                                
                            case 'tool_call':
                                // Add tool call steps
                                const toolSteps = update.data.tools.map((t: any) => ({
                                    id: `tool-${Date.now()}-${Math.random()}`,
                                    type: 'tool_call',
                                    content: `Executing ${t.name}...`,
                                    timestamp: Date.now(),
                                    metadata: { name: t.name, args: t.args }
                                }));
                                msg.thoughtProcess = [...(msg.thoughtProcess || []), ...toolSteps];
                                break;
                                
                            case 'tool_result':
                                // Add tool result step
                                const resultStep: ThoughtStep = {
                                    id: `result-${Date.now()}-${Math.random()}`,
                                    type: 'tool_result',
                                    content: update.data.success ? `${update.data.tool} completed` : `${update.data.tool} failed: ${update.data.error}`,
                                    timestamp: Date.now(),
                                    metadata: { success: update.data.success }
                                };
                                msg.thoughtProcess = [...(msg.thoughtProcess || []), resultStep];
                                break;
                                
                            case 'response':
                                // Update partial text
                                msg.text = update.data.response;
                                break;
                                
                            case 'error':
                                const errorStep: ThoughtStep = {
                                    id: `err-${Date.now()}`,
                                    type: 'error',
                                    content: update.data.message,
                                    timestamp: Date.now()
                                };
                                msg.thoughtProcess = [...(msg.thoughtProcess || []), errorStep];
                                break;
                        }
                        
                        newMessages[msgIndex] = msg;
                        return newMessages;
                    });
                }
            );
            
            // Finalize message state
            setMessages(prev => {
                const newMessages = [...prev];
                const msgIndex = newMessages.findIndex(m => m.id === responseId);
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
            // Update the response message to show error
            setMessages(prev => {
                const newMessages = [...prev];
                const msgIndex = newMessages.findIndex(m => m.id === responseId);
                if (msgIndex !== -1) {
                     newMessages[msgIndex] = {
                        ...newMessages[msgIndex],
                        isThinking: false,
                        text: newMessages[msgIndex].text + `\n\n**Error:** ${error.message}`
                    };
                }
                return newMessages;
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearHistory = async () => {
        if (confirm('Clear conversation history?')) {
            await chatHistoryStorage.clearHistory();
            setMessages([
                {
                    id: Date.now().toString(),
                    agentId: 'system',
                    text: 'History cleared.',
                    timestamp: Date.now(),
                    type: 'log'
                }
            ]);
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'active': return 'bg-green-500 animate-pulse';
            case 'waiting_approval': return 'bg-amber-500 animate-bounce';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className="relative flex flex-col h-full">
             {/* Waiting Approval Banner */}
            {agentsWaitingForApproval.length > 0 && (
                <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 p-2 z-10 flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-xs text-amber-200">
                        <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="font-bold">Shadow Protocol Active:</span>
                        <span>{agentsWaitingForApproval.length} agent(s) waiting for your approval.</span>
                    </div>
                    <button 
                        onClick={() => {
                             // We need a way to switch to the shadow panel or workbench
                             // For now, let's assume the user knows where to go, but we can dispatch a custom event or similar
                             window.dispatchEvent(new CustomEvent('navigate-to-shadow'));
                        }}
                        className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-3 py-1 rounded border border-amber-500/20 flex items-center transition-colors"
                    >
                        Review Actions <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                </div>
            )}

            <div className={cn("flex-1 flex flex-col", agentsWaitingForApproval.length > 0 ? "pt-10" : "")}>
                {/* Feed */}
                <ChatFeed
                    messages={messages}
                />

                {/* Input Area */}
                <ChatInput
                    onSend={handleSend}
                    onClear={handleClearHistory}
                    agentId={selectedAgentId || undefined}
                    disabled={isProcessing}
                />
            </div>

            {/* Right: Context */}
            <div className="absolute right-0 top-0 bottom-0 w-72 border-l border-border bg-secondary/5 hidden xl:block p-4 overflow-y-auto">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Active Context</h3>
                <div className="space-y-4">
                    <div className="p-3 border border-border bg-background">
                        <div className="text-[10px] text-muted-foreground mb-1">SYSTEM STATUS</div>
                        <div className="text-xs font-mono text-foreground">Online</div>
                    </div>
                    
                    {/* Agent Roster (can select agent here) */}
                    <div>
                        <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-bold">Active Agents</div>
                        <div className="space-y-2">
                            {agents.map(agent => (
                                <div 
                                    key={agent.id}
                                    onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                                    className={`p-2 border rounded cursor-pointer transition-colors ${
                                        selectedAgentId === agent.id 
                                            ? 'bg-primary/10 border-primary' 
                                            : 'bg-card border-border hover:bg-secondary'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-bold capitalize">{agent.name}</div>
                                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(agent.status)}`} />
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                        {agent.status === 'waiting_approval' ? 'Waiting for Approval' : (agent.currentTask || 'Idle')}
                                    </div>
                                    {agent.status === 'waiting_approval' && (
                                        <div className="mt-1 text-[9px] text-amber-500 flex items-center">
                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                            Action Pending
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
