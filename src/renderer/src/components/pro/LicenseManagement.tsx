/**
 * License Management - Rent-to-Own Progress
 * Shows license status and progress toward permanent ownership
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Crown, Sparkles, Check, ExternalLink, Trophy } from 'lucide-react';
import type { License, LicenseStatus } from '../../../../shared/types/license';

declare global {
  interface Window {
    api: any;
  }
}

export function LicenseManagement() {
  const [license, setLicense] = useState<License | null>(null);
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLicense();
  }, []);

  const loadLicense = async () => {
    try {
      const licenseResult = await window.api.license.get();
      const statusResult = await window.api.license.getStatus();

      if (licenseResult.success) {
        setLicense(licenseResult.data);
      }
      if (statusResult.success) {
        setStatus(statusResult.data);
      }
    } catch (err) {
      console.error('Failed to load license:', err);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setActivating(true);
    setError('');

    try {
      const result = await window.api.license.activate(licenseKey);

      if (result.success && result.data.valid) {
        await loadLicense();
        setLicenseKey('');
        setError('');
      } else {
        setError(result.data?.reason || 'Invalid license key');
      }
    } catch (err) {
      setError('Failed to activate license');
    } finally {
      setActivating(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove your license? You can re-activate it anytime.')) return;

    try {
      await window.api.license.remove();
      setLicense(null);
      setStatus(null);
    } catch (err) {
      console.error('Failed to remove license:', err);
    }
  };

  // Dev helpers
  const handleGenerateDev = async (monthsPaid: number) => {
    const result = await window.api.license.generateDev('dev@test.com', monthsPaid);
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

  // No license - show activation form
  if (!license || !status || !status.hasProAccess) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                Guru Pro License
              </CardTitle>
              <CardDescription>
                Unlock AI-powered features with rent-to-own pricing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold mb-2">What's included in Pro:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span><strong>Task Runner</strong> - AI executes coding tasks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span><strong>Second Face</strong> - Plain English diff summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span><strong>Auto-Context</strong> - AI-powered file selection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span><strong>Command Preview</strong> - Risk assessment for bash</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span><strong>State Graph</strong> - Token-efficient context</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h4 className="font-semibold mb-1 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Rent-to-Own Pricing
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Pay <strong>$15/month</strong> for 10 months. After paying <strong>$150 total</strong>, you <strong>own it forever</strong>! No more payments, keep using it permanently.
            </p>
          </div>

          <div className="space-y-2">
            <Label>License Key</Label>
            <div className="flex gap-2">
              <Input
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="email|date|months|unlocked|signature"
                disabled={activating}
              />
              <Button onClick={handleActivate} disabled={!licenseKey.trim() || activating}>
                {activating ? 'Activating...' : 'Activate'}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <Button asChild className="w-full" size="lg">
            <a href="https://guru.lemonsqueezy.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Subscribe to Guru Pro
            </a>
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs text-slate-500">Dev Tools:</p>
              <div className="flex gap-2">
                <Button onClick={() => handleGenerateDev(3)} variant="outline" size="sm">
                  Generate 3mo
                </Button>
                <Button onClick={() => handleGenerateDev(7)} variant="outline" size="sm">
                  Generate 7mo
                </Button>
                <Button onClick={() => handleGenerateUnlocked} variant="outline" size="sm">
                  Generate Unlocked
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Has license - show progress
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {status.isPermanent ? (
                <>
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  Guru Pro - Unlocked Forever
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Guru Pro - Active
                </>
              )}
            </CardTitle>
            <CardDescription>
              Licensed to {license.email}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.isPermanent ? (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-6 rounded-lg text-center">
            <Trophy className="h-12 w-12 mx-auto mb-3 text-yellow-600" />
            <h3 className="text-lg font-bold mb-1">🎉 You Own Guru Pro Forever!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You've paid ${license.totalPaid} and now have permanent access to all Pro features.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress to Ownership</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {status.monthsPaid}/{status.monthsPaid + status.monthsRemaining} months
                </span>
              </div>
              <Progress value={status.progress} className="h-2" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {status.message}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                <div className="text-2xl font-bold">{status.monthsPaid}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Months Paid</div>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                <div className="text-2xl font-bold">${license.totalPaid}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Total Paid</div>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                <div className="text-2xl font-bold">${status.monthsRemaining * 15}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Remaining</div>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRemove} size="sm">
            Remove License
          </Button>
          {!status.isPermanent && (
            <Button asChild variant="outline" size="sm">
              <a href="https://billing.lemonsqueezy.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Subscription
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
