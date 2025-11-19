import React, { useState, useEffect } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { AgentRoster }
    from '../components/chat/AgentRoster';
import { ChatFeed } from '../components/chat/ChatFeed';
import { Agent, ChatMessage } from '../types/control-room';
import { chatService } from '../services/chat.service';
import { AISettings } from '../components/settings/AISettings';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, Cpu } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const ChatPage = () => {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [agents, setAgents] = useState<Agent[]>([
        { id: 'ARCHITECT-01', name: 'System Architect', role: 'architect', status: 'idle', task: 'Idle', lastActive: Date.now() },
        { id: 'CODER-ALPHA', name: 'Lead Developer', role: 'coder', status: 'idle', task: 'Idle', lastActive: Date.now() },
        { id: 'QA-BOT', name: 'QA Engineer', role: 'qa', status: 'idle', task: 'Idle', lastActive: Date.now() }
    ]);

    // Model Selection State
    const [providers, setProviders] = useState<any[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('local:gpt2');

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
        // @ts-ignore
        const list = await window.api.ai.getProviders();
        setProviders(list);

        // Set default if not set (prefer Claude or GPT if available)
        const configured = list.filter((p: any) => p.isConfigured && p.id !== 'local');
        if (configured.length > 0) {
            // Default to first model of first configured provider
            const p = configured[0];
            if (p.models.length > 0) {
                setSelectedModel(`${p.id}:${p.models[0].id}`);
            }
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

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        // Set agent status to working
        const targetAgentId = selectedAgentId || 'SWARM_ALL';
        setAgents(prev => prev.map(a =>
            a.id === targetAgentId ? { ...a, status: 'working', task: 'Processing request...' } : a
        ));

        try {
            // Parse selected model
            const [providerId, modelId] = selectedModel.split(':');

            // Call real service with model config
            const response = await chatService.sendMessage(userMsg.text, targetAgentId, { providerId, modelId });
            setMessages(prev => [...prev, response]);
        } catch (error: any) {
            console.error('Chat error:', error);
            const errorMsg: ChatMessage = {
                id: Date.now().toString(),
                agentId: 'system',
                text: `Error: ${error.message}`,
                timestamp: Date.now(),
                type: 'log'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            // Reset agent status
            setAgents(prev => prev.map(a =>
                a.id === targetAgentId ? { ...a, status: 'idle', task: 'Idle' } : a
            ));
        }
    };

    return (
        <>
            {/* Feed */}
            < ChatFeed messages={messages} inputValue={inputValue} onInputChange={function (value: string): void {
                throw new Error('Function not implemented.');
            }} onSend={function (): void {
                throw new Error('Function not implemented.');
            }} />

            {/* Input Area */}
            < div className="p-4 border-t border-border bg-background" >
                <div className="relative flex items-end border border-border bg-secondary/10 focus-within:border-foreground/50 transition-colors">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={selectedAgentId ? `Message ${selectedAgentId}...` : "Broadcast to swarm..."}
                        className="flex-1 bg-transparent border-none p-3 min-h-[60px] max-h-[200px] resize-none focus:ring-0 text-sm font-mono text-foreground placeholder:text-muted-foreground/50"
                    />
                    <div className="flex items-center p-2 space-x-1">
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Paperclip className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleSend}
                            className="p-2 bg-foreground text-background hover:bg-foreground/90 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground font-mono flex justify-between">
                    <span>Markdown supported</span>
                    <span>Press Enter to send, Shift+Enter for new line</span>
                </div>
            </div >

            {/* Right: Context (Placeholder for now) */}
            < div className="w-72 border-l border-border bg-secondary/5 hidden xl:block p-4" >
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Active Context</h3>
                <div className="space-y-4">
                    <div className="p-3 border border-border bg-background">
                        <div className="text-[10px] text-muted-foreground mb-1">CURRENT FILE</div>
                        <div className="text-xs font-mono text-foreground overflow-scroll">src/renderer/src/pages/ChatPage.tsx</div>
                    </div>
                    <div className="p-3 border border-border bg-background">
                        <div className="text-[10px] text-muted-foreground mb-1">MEMORY RECALL</div>
                        <div className="text-xs text-foreground/80 italic overflow-scroll">
                            "User prefers 'Technical Brutalism' aesthetic with sharp corners and high contrast."
                        </div>
                    </div>
                </div>
            </div >
        </>
    );
};
