import React, { useState, useEffect } from 'react'
import { KnowledgeHub } from './components/KnowledgeHub'
import { Dashboard } from './components/Dashboard'
import { MemoryPanel } from './components/MemoryPanel'
import { SymbolGraph } from './components/SymbolGraph'
import { Button } from './components/ui/button'
import { Home, Database, Brain, Code } from 'lucide-react'
import { analytics } from './services/analytics'

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  chunkCount: number;
  lastUpdated: Date;
}

type ViewType = 'dashboard' | 'knowledge' | 'specs' | 'prompts' | 'memory' | 'symbols'

function App() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [sessionStartTime] = useState(Date.now())

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
      default:
        return null
    }
  }

  return (
    <div className="app dark h-screen bg-background text-foreground relative overflow-hidden">
      {/* Cosmic background with geometric patterns */}
      <div className="absolute inset-0 pattern-dots opacity-30" />

      <div className="h-full flex relative z-10">
        {/* Refined Sidebar */}
        <aside className="w-24 border-r border-border/60 glass-vibrant flex flex-col items-center py-8 gap-8 shadow-cosmic-lg relative overflow-hidden">
          {/* Subtle accent border */}
          <div className="absolute left-0 inset-y-0 w-[2px] bg-cosmic-gradient opacity-50" />

          {/* Logo with refined shadow */}
          <div className="mb-2 relative group animate-scale-in">
            <div className="absolute -inset-4 bg-white/5 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
            <div className="relative w-14 h-14 rounded-2xl bg-muted border-2 border-foreground/20 flex items-center justify-center text-lg font-bold shadow-cosmic-lg transform group-hover:scale-110 group-hover:border-foreground/30 transition-all duration-500">
              <span className="text-foreground">G</span>
            </div>
          </div>

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
          </div>

          {/* Subtle decorative element at bottom */}
          <div className="w-16 h-16 rounded-full bg-white/5 blur-xl animate-pulse" style={{ animationDuration: '6s' }} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">
          {/* Refined Header */}
          <header className="border-b border-border/60 px-10 py-8 glass-vibrant relative overflow-hidden animate-fade-in">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-twilight-gradient opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5" />

            {/* Content */}
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-bold tracking-tight text-gradient-vibrant mb-2">
                  Guru
                </h1>
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                  Context Engineering for AI
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-full glass-vibrant shadow-cosmic">
                <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">Online</span>
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
        transition-all duration-400 ease-out
        ${isActive
          ? 'bg-muted/40 border-2 border-foreground/30 shadow-cosmic-lg'
          : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground shadow-cosmic border-2 border-transparent'
        }
      `}
    >
      {isActive && (
        <>
          {/* Refined subtle glow */}
          <div className="absolute -inset-2 bg-white/5 rounded-2xl blur-xl opacity-60" />
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent rounded-2xl" />
        </>
      )}
      <Icon className={`
        relative z-10 transition-all duration-400
        ${isActive
          ? 'h-6 w-6 scale-110 text-foreground'
          : 'h-5 w-5 group-hover:scale-110 group-hover:text-foreground'
        }
      `} />
    </button>
  )
}

export default App
