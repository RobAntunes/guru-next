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
      {/* Ambient atmospheric gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/50 to-card/30" />
      </div>

      <div className="h-full flex relative z-10">
        {/* Refined Sidebar Navigation */}
        <aside className="w-20 border-r border-border/50 bg-card/40 backdrop-blur-xl flex flex-col items-center py-8 gap-6 shadow-luxury">
          <div className="mb-4 relative group">
            <div className="absolute -inset-3 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-primary/80 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-luxury">
              G
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3">
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
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Refined Header */}
          <header className="border-b border-border/50 px-8 py-6 bg-card/20 backdrop-blur-sm relative animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
            <div className="relative">
              <h1 className="text-3xl font-light tracking-tight text-gradient" style={{ fontVariationSettings: '"opsz" 144, "wght" 300' }}>
                Guru
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1 font-medium">
                Context Engineering for AI
              </p>
            </div>
          </header>

          {/* Main View */}
          <main className="flex-1 overflow-hidden relative">
            <div className="h-full animate-fade-in delay-100">
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
        group relative w-12 h-12 rounded-xl
        flex items-center justify-center
        transition-all duration-300 ease-out
        ${isActive
          ? 'bg-primary text-primary-foreground shadow-luxury'
          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        }
      `}
    >
      {isActive && (
        <>
          <div className="absolute -inset-1 bg-primary/30 rounded-xl blur-md" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl opacity-90" />
        </>
      )}
      <Icon className={`
        relative z-10 transition-transform duration-300
        ${isActive ? 'h-5 w-5 scale-110' : 'h-5 w-5 group-hover:scale-110'}
      `} />
    </button>
  )
}

export default App
