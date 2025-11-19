import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, Key, Shield, Server } from 'lucide-react';

interface Provider {
    id: string;
    name: string;
    models: any[];
    isConfigured: boolean;
}

export const AISettings = () => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [keys, setKeys] = useState<Record<string, string>>({});

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            // @ts-ignore
            if (!window.api?.ai?.getProviders) {
                console.warn('AI Providers API not available');
                return;
            }
            // @ts-ignore
            const list = await window.api.ai.getProviders();
            setProviders(list);
        } catch (error) {
            console.error('Failed to load providers:', error);
        }
    };

    const handleSaveKey = async (providerId: string) => {
        const key = keys[providerId];
        if (!key) return;

        try {
            // @ts-ignore
            if (!window.api?.ai?.setKey) {
                console.error('AI setKey API not available');
                return;
            }
            // @ts-ignore
            await window.api.ai.setKey(providerId, key);
            await loadProviders();
            setKeys(prev => ({ ...prev, [providerId]: '' })); // Clear input after save
        } catch (error) {
            console.error('Failed to save key:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Server className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight">AI Model Providers</h2>
            </div>

            <div className="grid gap-4">
                {providers.map(provider => (
                    <Card key={provider.id} className="p-4 bg-card border-border">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{provider.name}</h3>
                                    {provider.isConfigured ? (
                                        <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                                            <Check className="w-3 h-3 mr-1" /> Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-muted-foreground">
                                            Not Configured
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {provider.models.length} models available
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder={`Enter ${provider.name} API Key`}
                                    className="pl-9 bg-muted/50 border-border"
                                    value={keys[provider.id] || ''}
                                    onChange={(e) => setKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                />
                            </div>
                            <Button
                                onClick={() => handleSaveKey(provider.id)}
                                disabled={!keys[provider.id]}
                                variant="secondary"
                            >
                                Save
                            </Button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {provider.models.map((model: any) => (
                                <Badge key={model.id} variant="secondary" className="text-[10px] font-mono">
                                    {model.name}
                                </Badge>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};
