/**
 * License Prompt - Paywall for Pro features (Rent-to-Own)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Crown, Sparkles, Trophy, ExternalLink } from 'lucide-react';

declare global {
  interface Window {
    api: any;
  }
}

interface LicensePromptProps {
  feature: string;
  onUpgrade?: () => void;
  onClose?: () => void;
}

export function LicensePrompt({ feature, onUpgrade, onClose }: LicensePromptProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [validating, setValidating] = useState(false);

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;

    setValidating(true);
    try {
      const result = await window.api.license.activate(licenseKey);
      if (result.success && result.data.valid) {
        alert('License activated! Enjoy Pro features.');
        onUpgrade?.();
        onClose?.();
      } else {
        alert('Invalid license key: ' + (result.data.reason || result.error));
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setValidating(false);
    }
  };

  // Dev helpers
  const handleGenerateDev = async () => {
    const result = await window.api.license.generateDev('dev@test.com', 5);
    if (result.success) {
      setLicenseKey(result.data);
    }
  };

  const handleGenerateUnlocked = async () => {
    const result = await window.api.license.generateUnlocked('unlocked@test.com');
    if (result.success) {
      setLicenseKey(result.data);
    }
  };

  return (
    <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              Upgrade to Guru Pro
            </CardTitle>
            <CardDescription>
              <strong>{feature}</strong> requires a Pro license
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-yellow-600 mt-1" />
            <div className="text-sm">
              <strong>All Pro Features:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>AI Task Runner</li>
                <li>Second Face (diff summaries)</li>
                <li>Auto-Context Selection</li>
                <li>Command Preview & Safety</li>
                <li>State Graph Management</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
          <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Rent-to-Own: $15/month
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Pay for <strong>10 months</strong> ($150 total) and <strong>own it forever</strong>. No more payments after that!
          </p>
        </div>

        <div className="space-y-2">
          <Label>Have a License Key?</Label>
          <Input
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="Paste your license key here"
          />
          <Button onClick={handleActivate} disabled={!licenseKey.trim() || validating} className="w-full">
            {validating ? 'Activating...' : 'Activate License'}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 px-2 text-slate-500">
              Or
            </span>
          </div>
        </div>

        <Button asChild size="lg" className="w-full">
          <a href="https://guru.lemonsqueezy.com" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Subscribe to Guru Pro
          </a>
        </Button>

        {process.env.NODE_ENV === 'development' && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs text-slate-500">Dev Tools:</p>
            <div className="flex gap-2">
              <Button onClick={handleGenerateDev} variant="outline" size="sm" className="flex-1">
                5mo Key
              </Button>
              <Button onClick={handleGenerateUnlocked} variant="outline" size="sm" className="flex-1">
                Unlocked
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
