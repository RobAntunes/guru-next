import React, { useState, useEffect } from 'react'
import { KnowledgeHub } from './components/KnowledgeHub'
import { Dashboard } from './components/Dashboard'
import { MemoryPanel } from './components/MemoryPanel'
import { SymbolGraph } from './components/SymbolGraph'
import { ProjectManagement } from './components/ProjectManagement'
import { Settings } from './components/Settings'
import { ContextBuilder } from './components/ContextBuilder'
import { ProjectSidebar } from './components/ProjectSidebar'
import { StatusBar } from './components/StatusBar'
import { Button } from './components/ui/button'
import { Home, Database, Brain, Code, Settings as SettingsIcon, FolderKanban, ChevronDown, Plus, Check, Sun, Moon, FileCode, Power, PowerOff } from 'lucide-react'
import { analytics } from './services/analytics'
import { projectStorage, Project } from './services/project-storage'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog'
import { Input } from './components/ui/input'
import { Label } from './components/ui/label'

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  chunkCount: number;
  lastUpdated: Date;
}

type ViewType = 'dashboard' | 'knowledge' | 'specs' | 'prompts' | 'memory' | 'symbols' | 'projects' | 'settings' | 'context'

function App() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [sessionStartTime] = useState(Date.now())
  const [mcpServerActive, setMcpServerActive] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    // Initialize theme from localStorage or default to 'dark'
    try {
      const saved = localStorage.getItem('app-settings')
      if (saved) {
        const settings = JSON.parse(saved)
        return settings.theme || 'dark'
      }
    } catch (error) {
      console.error('Failed to load initial theme:', error)
    }
    return 'dark'
  })

  // Theme management
  useEffect(() => {
    // Load theme from settings
    const loadTheme = () => {
      try {
        const saved = localStorage.getItem('app-settings')
        if (saved) {
          const settings = JSON.parse(saved)
          setTheme(settings.theme || 'dark')
        }
      } catch (error) {
        console.error('Failed to load theme:', error)
      }
    }
    loadTheme()

    // Listen for settings changes
    const handleStorageChange = () => {
      loadTheme()
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // System theme detection and application
  useEffect(() => {
    const applyTheme = (themeMode: 'light' | 'dark' | 'system') => {
      const root = document.documentElement

      if (themeMode === 'system') {
        // Detect system preference
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', isDark)
      } else {
        root.classList.toggle('dark', themeMode === 'dark')
      }
    }

    applyTheme(theme)

    // Listen for system theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches)
      }
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [theme])

  useEffect(() => {
    // Initialize analytics
    const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_development'
    const ENABLE_DEV = import.meta.env.VITE_ENABLE_ANALYTICS_DEV === 'true'

    analytics.initialize({
      apiKey: POSTHOG_KEY,
      apiHost: import.meta.env.VITE_POSTHOG_HOST,
      enabled: import.meta.env.PROD || ENABLE_DEV // Enable in production OR if dev flag is set
    })

    // Track session start
    analytics.trackSessionStart()

    // Track session end on unmount
    return () => {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000)
      analytics.trackSessionEnd(duration)
    }
  }, [sessionStartTime])

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view)
    analytics.trackPageView(view)
  }

  const toggleMCPServer = () => {
    // TODO: Implement actual MCP server toggle
    setMcpServerActive(!mcpServerActive)
    analytics.track('mcp_server_toggle', { active: !mcpServerActive })
  }

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)

    // Save to localStorage
    try {
      const saved = localStorage.getItem('app-settings')
      const settings = saved ? JSON.parse(saved) : {}
      settings.theme = nextTheme
      localStorage.setItem('app-settings', JSON.stringify(settings))
      window.dispatchEvent(new Event('storage'))
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} knowledgeBases={knowledgeBases} />
      case 'knowledge':
      case 'specs':
      case 'prompts':
        return (
          <KnowledgeHub
            knowledgeBases={knowledgeBases}
            setKnowledgeBases={setKnowledgeBases}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )
      case 'memory':
        return <MemoryPanel />
      case 'symbols':
        return <SymbolGraph />
      case 'context':
        return <ContextBuilder />
      case 'projects':
        return <ProjectManagement />
      case 'settings':
        return <Settings />
      default:
        return null
    }
  }

  return (
    <div className="app h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* New Project Sidebar */}
        <ProjectSidebar currentView={currentView} onNavigate={handleNavigate} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Simplified Header */}
          <header className="h-12 border-b border-border bg-card px-6 flex items-center justify-between">
            <h1 className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em]">
              Guru · {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </h1>

            {/* Header Controls */}
            <div className="flex items-center gap-2">
              {/* MCP Server Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMCPServer}
                className={`h-8 px-3 text-xs font-medium transition-all ${
                  mcpServerActive
                    ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {mcpServerActive ? (
                  <>
                    <Power className="h-3 w-3 mr-1.5" />
                    MCP Active
                  </>
                ) : (
                  <>
                    <PowerOff className="h-3 w-3 mr-1.5" />
                    MCP Off
                  </>
                )}
              </Button>

              {/* Theme Switcher */}
              <Button
                variant="ghost"
                size="sm"
                onClick={cycleTheme}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={`Theme: ${theme}`}
              >
                {theme === 'light' ? (
                  <Sun className="h-4 w-4" />
                ) : theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Code className="h-4 w-4" />
                )}
              </Button>
            </div>
          </header>

          {/* Main View */}
          <main className="flex-1 overflow-hidden bg-gradient-to-br from-background via-card to-background">
            {renderView()}
          </main>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        nodeCount={1284}
        memoryUsage={92}
        tokensPerSession={38.4}
        estimatedCost={0.42}
      />
    </div>
  )
}

export default App
