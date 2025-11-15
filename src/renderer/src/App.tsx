import React, { useState, useEffect } from 'react'
import { KnowledgeHub } from './components/KnowledgeHub'
import { Dashboard } from './components/Dashboard'
import { MemoryPanel } from './components/MemoryPanel'
import { SymbolGraph } from './components/SymbolGraph'
import { ProjectManagement } from './components/ProjectManagement'
import { Settings } from './components/Settings'
import { ContextBuilder } from './components/ContextBuilder'
import { Button } from './components/ui/button'
import { Home, Database, Brain, Code, Settings as SettingsIcon, FolderKanban, ChevronDown, Plus, Check, Sun, Moon, FileCode } from 'lucide-react'
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
  const [serverActive, setServerActive] = useState(true)
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
    <div className="app h-screen bg-background text-foreground relative overflow-hidden">
      {/* Cosmic background with geometric patterns */}
      <div className="absolute inset-0 pattern-dots opacity-30" />

      <div className="h-full flex relative z-10">
        {/* Refined Sidebar */}
        <aside className="w-24 border-r border-border/60 glass-vibrant flex flex-col items-center py-8 gap-8 shadow-cosmic-lg relative overflow-hidden">
          {/* Subtle accent border */}
          <div className="absolute left-0 inset-y-0 w-[2px] bg-cosmic-gradient opacity-50" />

          {/* Logo with refined shadow */}
          <div className="mb-2 relative group animate-scale-in">
            <div className="absolute -inset-4 bg-white/10 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 animate-glow-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-muted border-2 border-foreground/20 flex items-center justify-center text-lg font-bold shadow-cosmic-lg transform group-hover:scale-110 group-hover:border-foreground/40 group-hover:rotate-6 transition-all duration-500 cursor-pointer">
              <span className="text-foreground group-hover:scale-110 transition-transform duration-300">G</span>
            </div>
          </div>

          {/* Project Switcher */}
          <button
            className="w-14 h-14 rounded-2xl bg-muted/30 border-2 border-foreground/10 flex flex-col items-center justify-center shadow-cosmic hover:scale-110 hover:border-foreground/20 hover:-translate-y-1 hover:shadow-cosmic-lg transition-all duration-500 group relative overflow-hidden animate-fade-in delay-100"
            title="Project Management"
            onClick={() => handleNavigate('projects')}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <FolderKanban className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all duration-300 relative z-10" />
            <ChevronDown className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground/80 group-hover:translate-y-0.5 transition-all duration-300 relative z-10 -mt-1" />
          </button>

          <div className="w-12 h-px bg-border/30 my-2" />

          {/* Navigation buttons */}
          <div className="flex-1 flex flex-col gap-4">
            <NavButton
              icon={Home}
              isActive={currentView === 'dashboard'}
              onClick={() => handleNavigate('dashboard')}
              label="Dashboard"
            />
            <NavButton
              icon={Database}
              isActive={currentView === 'knowledge'}
              onClick={() => handleNavigate('knowledge')}
              label="Knowledge"
            />
            <NavButton
              icon={Brain}
              isActive={currentView === 'memory'}
              onClick={() => handleNavigate('memory')}
              label="Memory"
            />
            <NavButton
              icon={Code}
              isActive={currentView === 'symbols'}
              onClick={() => handleNavigate('symbols')}
              label="Symbols"
            />
            <NavButton
              icon={FileCode}
              isActive={currentView === 'context'}
              onClick={() => handleNavigate('context')}
              label="Context"
            />
          </div>

          <div className="w-12 h-px bg-border/30 my-2" />

          {/* Settings Button */}
          <button
            className="w-14 h-14 rounded-2xl bg-muted/30 border-2 border-foreground/10 flex items-center justify-center shadow-cosmic hover:scale-110 hover:border-foreground/20 hover:-translate-y-1 hover:shadow-cosmic-lg hover:rotate-90 transition-all duration-500 group relative overflow-hidden animate-fade-in delay-400"
            title="Settings"
            onClick={() => handleNavigate('settings')}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <SettingsIcon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-all duration-300 relative z-10" />
          </button>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">
          {/* Refined Header */}
          <header className="border-b border-border/60 px-10 py-8 glass-vibrant relative overflow-hidden animate-fade-in">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-twilight-gradient opacity-40 shimmer" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5" />

            {/* Content */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="animate-slide-in">
                <h1 className="text-5xl font-bold tracking-tight text-gradient-vibrant mb-2 animate-bounce-hover">
                  Guru
                </h1>
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold animate-fade-in delay-100">
                  Context Engineering for AI
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Theme switcher button */}
                <button
                  onClick={() => {
                    const newTheme = theme === 'dark' ? 'light' : 'dark'
                    setTheme(newTheme)

                    // Save to localStorage
                    try {
                      const saved = localStorage.getItem('app-settings')
                      const settings = saved ? JSON.parse(saved) : {}
                      settings.theme = newTheme
                      localStorage.setItem('app-settings', JSON.stringify(settings))
                    } catch (error) {
                      console.error('Failed to save theme:', error)
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full glass-vibrant shadow-cosmic animate-fade-in delay-150 hover:scale-105 hover:shadow-cosmic-lg transition-all duration-300 cursor-pointer group border-2 border-transparent hover:border-foreground/20"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-foreground group-hover:rotate-180 transition-transform duration-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-foreground group-hover:-rotate-12 transition-transform duration-500" />
                  )}
                </button>

                {/* Server status button */}
                <button
                  onClick={() => setServerActive(!serverActive)}
                  className="flex items-center gap-3 px-5 py-2.5 rounded-full glass-vibrant shadow-cosmic animate-fade-in delay-200 hover:scale-105 hover:shadow-cosmic-lg transition-all duration-300 cursor-pointer group border-2 border-transparent hover:border-foreground/20"
                >
                  <div className="relative">
                    {/* Pulsing ring */}
                    <div className={`absolute -inset-1 rounded-full blur-sm animate-pulse ${
                      serverActive ? 'bg-green-500/50' : 'bg-red-500/50'
                    }`} style={{ animationDuration: '2s' }} />
                    {/* Core dot */}
                    <div className={`relative w-2 h-2 rounded-full ${
                      serverActive ? 'bg-green-500' : 'bg-red-500'
                    } shadow-[0_0_8px_currentColor]`} />
                  </div>
                  <span className="text-xs font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
                    {serverActive ? 'Server Active' : 'Server Offline'}
                  </span>
                </button>
              </div>
            </div>
          </header>

          {/* Main View with pattern */}
          <main className="flex-1 overflow-hidden relative">
            <div className="h-full animate-fade-in delay-150">
              {renderView()}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

// Custom Navigation Button Component
interface NavButtonProps {
  icon: React.ElementType
  isActive: boolean
  onClick: () => void
  label: string
}

function NavButton({ icon: Icon, isActive, onClick, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        group relative w-14 h-14 rounded-2xl
        flex items-center justify-center
        transition-all duration-500 ease-out
        ${isActive
          ? 'bg-primary/20 border-2 border-primary shadow-cosmic-lg scale-105'
          : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:scale-110 hover:-translate-y-1 shadow-cosmic border-2 border-transparent hover:border-foreground/20'
        }
      `}
    >
      {isActive && (
        <>
          {/* Active state glow */}
          <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-xl opacity-70 animate-pulse" />
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-transparent rounded-2xl shimmer" />
          {/* Active indicator dot */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_currentColor]" />
        </>
      )}
      <Icon className={`
        relative z-10 transition-all duration-400
        ${isActive
          ? 'h-6 w-6 scale-110 text-foreground drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
          : 'h-5 w-5 group-hover:scale-125 group-hover:rotate-12 group-hover:text-foreground'
        }
      `} />
    </button>
  )
}

export default App
