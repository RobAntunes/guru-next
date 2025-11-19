/**
 * Settings - Application configuration and preferences
 */

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import {
  Activity,
  AlertTriangle,
  Database,
  Info,
  Moon,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Sun,
  Trash2,
} from "lucide-react";
import { analytics } from "../services/analytics";
import { ApiKeySettings } from "./pro/ApiKeySettings";
import { LicenseManagement } from "./pro/LicenseManagement";

interface AppSettings {
  theme: "light" | "dark" | "system";
  analyticsEnabled: boolean;
  apiHost: string;
  apiKey: string;
  autoSave: boolean;
  cacheDuration: number;
}

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    theme: "dark",
    analyticsEnabled: true,
    apiHost: import.meta.env.VITE_POSTHOG_HOST || "",
    apiKey: import.meta.env.VITE_POSTHOG_KEY || "",
    autoSave: true,
    cacheDuration: 3600,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    analytics.trackPageView("settings");
  }, []);

  const loadSettings = async () => {
    try {
      // Load settings from localStorage or backend
      const saved = localStorage.getItem("app-settings");
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      analytics.trackError(error as Error, "settings_load");
    }
  };

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);

    // Apply theme immediately for preview
    if (key === "theme") {
      const root = document.documentElement;
      const themeValue = value as "light" | "dark" | "system";
      if (themeValue === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", isDark);
      } else {
        root.classList.toggle("dark", themeValue === "dark");
      }
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("app-settings", JSON.stringify(settings));
      analytics.track("settings_saved", { settings });
      setHasChanges(false);

      // Apply theme immediately
      const root = document.documentElement;
      if (settings.theme === "system") {
        // Detect system preference
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", isDark);
      } else {
        root.classList.toggle("dark", settings.theme === "dark");
      }

      // Trigger a page reload to ensure theme is fully applied
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Failed to save settings:", error);
      analytics.trackError(error as Error, "settings_save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      const defaults: AppSettings = {
        theme: "dark",
        analyticsEnabled: true,
        apiHost: import.meta.env.VITE_POSTHOG_HOST || "",
        apiKey: import.meta.env.VITE_POSTHOG_KEY || "",
        autoSave: true,
        cacheDuration: 3600,
      };
      setSettings(defaults);
      setHasChanges(true);
      analytics.track("settings_reset");
    }
  };

  const handleClearCache = async () => {
    if (confirm("This will clear all cached data. Continue?")) {
      try {
        localStorage.clear();
        analytics.track("cache_cleared");
        alert("Cache cleared successfully");
      } catch (error) {
        console.error("Failed to clear cache:", error);
        analytics.trackError(error as Error, "cache_clear");
      }
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
              <SettingsIcon className="h-8 w-8" />
              Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Configure your application preferences
            </p>
          </div>

          {hasChanges && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadSettings}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                variant="outline"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.theme === "dark"
                ? <Moon className="h-5 w-5" />
                : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>Customize how Guru looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={settings.theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSettingChange("theme", "light")}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant={settings.theme === "dark" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleSettingChange("theme", "dark")}
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={settings.theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSettingChange("theme", "system")}
                >
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Analytics
            </CardTitle>
            <CardDescription>
              Help us improve Guru by sharing usage data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Share anonymous usage data to help improve the app
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleSettingChange(
                    "analyticsEnabled",
                    !settings.analyticsEnabled,
                  )}
              >
                {settings.analyticsEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="api-host">Analytics API Host</Label>
              <Input
                id="api-host"
                value={settings.apiHost}
                onChange={(e) => handleSettingChange("apiHost", e.target.value)}
                placeholder="https://app.posthog.com"
                disabled={!settings.analyticsEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">Analytics API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={settings.apiKey}
                onChange={(e) => handleSettingChange("apiKey", e.target.value)}
                placeholder="phc_..."
                disabled={!settings.analyticsEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage
            </CardTitle>
            <CardDescription>Manage local data and cache</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto-save</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save changes as you work
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleSettingChange("autoSave", !settings.autoSave)}
              >
                {settings.autoSave ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="cache-duration">Cache Duration (seconds)</Label>
              <Input
                id="cache-duration"
                type="number"
                value={settings.cacheDuration}
                onChange={(e) =>
                  handleSettingChange(
                    "cacheDuration",
                    parseInt(e.target.value),
                  )}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                How long to keep cached data before refreshing
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Clear Cache</Label>
                <p className="text-sm text-muted-foreground">
                  Remove all cached data and reset storage
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Guru Pro */}
        <LicenseManagement />

        <ApiKeySettings />

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About
            </CardTitle>
            <CardDescription>Application information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Build</span>
              <span className="font-medium">Development</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-medium">Electron</span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Reset All Settings</Label>
                <p className="text-sm text-muted-foreground">
                  Restore all settings to their default values
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSettings}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
