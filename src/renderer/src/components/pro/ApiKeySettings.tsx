/**
 * API Key Settings - Manage AI provider API keys
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Key, Check, X } from 'lucide-react';

declare global {
  interface Window {
    api: any;
  }
}

export function ApiKeySettings() {
  const [providers, setProviders] = useState<Array<{ id: string; name: string; models: string[]; isConfigured: boolean }>>([]);
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [selectedProvider]);

  const loadProviders = async () => {
    const result = await window.api.aiProvider.list();
    if (result.success) {
      setProviders(result.data);
      // If no provider selected and we have providers, select the first one
      if (!selectedProvider && result.data.length > 0) {
        setSelectedProvider(result.data[0].id);
      }
    }
  };

  const checkApiKey = async () => {
    if (!selectedProvider) return;
    const result = await window.api.aiProvider.checkKey(selectedProvider);
    if (result.success) {
      setHasKey(result.data);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;

    setSaving(true);
    try {
      const result = await window.api.aiProvider.setKey(selectedProvider, apiKey);
      if (result.success) {
        setHasKey(true);
        setApiKey('');
        alert('API key saved successfully!');
      } else {
        alert('Failed to save API key: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    const result = await window.api.aiProvider.removeKey(selectedProvider);
    if (result.success) {
      setHasKey(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          AI Provider API Keys
        </CardTitle>
        <CardDescription>
          Configure API keys for different AI providers (Claude, GPT, Gemini)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>API Key</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? '••••••••••••••••' : 'Enter API key'}
            />
            {hasKey ? (
              <Button variant="outline" onClick={handleRemove}>
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!apiKey.trim() || saving}>
                {saving ? '...' : <Check className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {hasKey && (
            <p className="text-sm text-green-600">✓ API key configured</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
