/**
 * Dashboard - Landing page with overview and quick actions
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import {
  Database,
  FileText,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  Clock,
  Activity,
  Brain,
  Code,
  ArrowRight
} from 'lucide-react'
import { memoryStorage } from '../services/memory-storage'
import { analytics } from '../services/analytics'
import { specStorage } from '../services/spec-storage'
import { promptStorage } from '../services/prompt-storage'

interface DashboardProps {
  onNavigate: (view: 'knowledge' | 'specs' | 'prompts' | 'memory' | 'symbols') => void
  knowledgeBases: any[]
}

interface DashboardStats {
  knowledgeBases: number
  totalDocuments: number
  specs: number
  prompts: number
  memories: number
  patterns: number
  insights: number
  lastActivity: Date | null
}

export function Dashboard({ onNavigate, knowledgeBases }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    knowledgeBases: 0,
    totalDocuments: 0,
    specs: 0,
    prompts: 0,
    memories: 0,
    patterns: 0,
    insights: 0,
    lastActivity: null
  })
  const [recentInsights, setRecentInsights] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
    analytics.trackPageView('dashboard')
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load knowledge base stats
      const kbCount = knowledgeBases.length
      const totalDocs = knowledgeBases.reduce((sum, kb) => sum + (kb.documentCount || 0), 0)

      // Load specs and prompts
      const specs = await specStorage.getAllSpecs()
      const prompts = await promptStorage.getAllTemplates()

      // Load memory stats
      const memoryStats = await memoryStorage.getStats()

      // Load recent insights
      const insights = await memoryStorage.listInsights()

      setStats({
        knowledgeBases: kbCount,
        totalDocuments: totalDocs,
        specs: specs.length,
        prompts: prompts.length,
        memories: memoryStats.memories,
        patterns: memoryStats.patterns,
        insights: memoryStats.insights,
        lastActivity: new Date()
      })

      setRecentInsights(insights.slice(0, 3))
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      analytics.trackError(error as Error, 'dashboard_load')
    }
  }

  const handleNavigate = (view: 'knowledge' | 'specs' | 'prompts' | 'memory' | 'symbols') => {
    analytics.track('dashboard_navigation', { destination: view })
    onNavigate(view)
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-light tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Overview of your context engineering workspace</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleNavigate('knowledge')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Knowledge Bases</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.knowledgeBases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalDocuments} documents total
              </p>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleNavigate('specs')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Specs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.specs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Context specifications
              </p>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleNavigate('prompts')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Prompts</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.prompts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Prompt templates
              </p>
            </CardContent>
          </Card>

          <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleNavigate('memory')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Memory</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.memories}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.patterns} patterns, {stats.insights} insights
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-4 bg-muted/30 hover:bg-muted text-foreground shadow-none!"
              onClick={() => handleNavigate('knowledge')}
            >
              <Database className="mr-2 h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              <div className="text-left">
                <div className="font-medium">Create Knowledge Base</div>
                <div className="text-xs text-muted-foreground">Add new documents</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4 bg-muted/30 hover:bg-muted text-foreground shadow-none!"
              onClick={() => handleNavigate('specs')}
            >
              <FileText className="mr-2 h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              <div className="text-left">
                <div className="font-medium">New Spec</div>
                <div className="text-xs text-muted-foreground">Define context rules</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4 bg-muted/30 hover:bg-muted text-foreground shadow-none!"
              onClick={() => handleNavigate('prompts')}
            >
              <MessageSquare className="mr-2 h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              <div className="text-left">
                <div className="font-medium">New Prompt</div>
                <div className="text-xs text-muted-foreground">Create template</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4 bg-muted/30 hover:bg-muted text-foreground shadow-none!"
              onClick={() => handleNavigate('symbols')}
            >
              <Code className="mr-2 h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              <div className="text-left">
                <div className="font-medium">Code Symbols</div>
                <div className="text-xs text-muted-foreground">Visualize codebase</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4 bg-muted/30 hover:bg-muted text-foreground shadow-none!"
              onClick={() => handleNavigate('memory')}
            >
              <Brain className="mr-2 h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              <div className="text-left">
                <div className="font-medium">View Memory</div>
                <div className="text-xs text-muted-foreground">Patterns & insights</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-4 bg-muted/30 hover:bg-muted text-foreground shadow-none!"
              onClick={async () => {
                await memoryStorage.generateInsights()
                analytics.track('insights_generated', { source: 'dashboard' })
                loadDashboardData()
              }}
            >
              <Lightbulb className="mr-2 h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              <div className="text-left">
                <div className="font-medium">Generate Insights</div>
                <div className="text-xs text-muted-foreground">Analyze patterns</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Insights */}
        {recentInsights.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Recent Insights</CardTitle>
                  <CardDescription className="text-muted-foreground">AI-generated patterns from your usage</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => handleNavigate('memory')}
                >
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Lightbulb className="h-5 w-5 mt-0.5" style={{ color: 'hsl(var(--primary))' }} />
                  <div className="flex-1">
                    <p className="text-sm text-foreground/90">{insight.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {Math.round(insight.confidence * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Activity Summary */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Activity</span>
              <span className="font-medium flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {stats.lastActivity ? stats.lastActivity.toLocaleTimeString() : 'No activity yet'}
              </span>
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Resources</span>
              <span className="font-medium text-foreground">
                {stats.knowledgeBases + stats.specs + stats.prompts} items
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started (if no data) */}
        {stats.knowledgeBases === 0 && stats.specs === 0 && (
          <Card className="border-dashed border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Getting Started</CardTitle>
              <CardDescription className="text-muted-foreground">Start building your context engineering workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-foreground/90">
                  <strong className="text-foreground">1. Create a Knowledge Base</strong> - Upload documents and build searchable context
                </p>
                <p className="text-sm text-foreground/90">
                  <strong className="text-foreground">2. Define Specs</strong> - Set rules for how context should be organized
                </p>
                <p className="text-sm text-foreground/90">
                  <strong className="text-foreground">3. Build Prompts</strong> - Create reusable templates for AI interactions
                </p>
              </div>
              <Button onClick={() => handleNavigate('knowledge')} variant="outline" className="bg-muted/30 hover:bg-muted shadow-none! text-foreground">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
