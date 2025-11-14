/**
 * Memory Panel - View and manage memories, patterns, and insights
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'
import {
  Brain,
  Search,
  Lightbulb,
  Clock,
  Tag,
  TrendingUp,
  X,
  Filter,
  RefreshCw
} from 'lucide-react'
import { memoryStorage } from '../services/memory-storage'
import { analytics } from '../services/analytics'

interface Memory {
  id: string
  type: 'pattern' | 'insight' | 'interaction' | 'preference'
  content: string
  timestamp: Date
  confidence: number
  context: string[]
  tags: string[]
  metadata: any
}

interface MemoryStats {
  memories: number
  patterns: number
  insights: number
}

export function MemoryPanel() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [stats, setStats] = useState<MemoryStats>({ memories: 0, patterns: 0, insights: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)

  useEffect(() => {
    loadMemoryData()
    analytics.trackPageView('memory')
  }, [])

  const loadMemoryData = async () => {
    setIsLoading(true)
    try {
      const [memoryStats, insightsList] = await Promise.all([
        memoryStorage.getStats(),
        memoryStorage.listInsights()
      ])

      setStats(memoryStats)
      setInsights(insightsList)

      // Search all memories if there's a query
      if (searchQuery) {
        const results = await memoryStorage.search(searchQuery, 50)
        setMemories(results)
      }
    } catch (error) {
      console.error('Failed to load memory data:', error)
      analytics.trackError(error as Error, 'memory_load')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const results = await memoryStorage.search(searchQuery, 50)
      setMemories(results)
      analytics.trackMemory('searched', { query: searchQuery, resultCount: results.length })
    } catch (error) {
      console.error('Memory search failed:', error)
      analytics.trackError(error as Error, 'memory_search')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true)
    try {
      await memoryStorage.generateInsights()
      await loadMemoryData()
      analytics.trackMemory('insights_generated')
    } catch (error) {
      console.error('Failed to generate insights:', error)
      analytics.trackError(error as Error, 'insights_generation')
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  const handleDismissInsight = async (id: string) => {
    try {
      await memoryStorage.dismissInsight(id)
      setInsights(insights.filter(i => i.id !== id))
      analytics.trackMemory('dismissed', { insightId: id })
    } catch (error) {
      console.error('Failed to dismiss insight:', error)
    }
  }

  const filteredMemories = selectedType
    ? memories.filter(m => m.type === selectedType)
    : memories

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pattern': return 'bg-blue-500/10 text-blue-500'
      case 'insight': return 'bg-purple-500/10 text-purple-500'
      case 'interaction': return 'bg-green-500/10 text-green-500'
      case 'preference': return 'bg-amber-500/10 text-amber-500'
      default: return 'bg-gray-500/10 text-gray-500'
    }
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-light tracking-tight flex items-center gap-2">
              <Brain className="h-8 w-8" />
              Memory System
            </h2>
            <p className="text-muted-foreground mt-1">
              Patterns, insights, and learned preferences from your usage
            </p>
          </div>
          <Button
            onClick={handleGenerateInsights}
            disabled={isGeneratingInsights}
          >
            {isGeneratingInsights ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Generate Insights
              </>
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Total Memories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.memories}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Patterns Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.patterns}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Active Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="memories">Memories</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Insights</CardTitle>
                <CardDescription>
                  Patterns and recommendations based on your usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.length === 0 ? (
                  <div className="text-center py-12">
                    <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No insights yet. Use Guru for a while, then generate insights.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {insights.map((insight) => (
                        <div
                          key={insight.id}
                          className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-amber-500" />
                                <span className="font-medium">{insight.title || 'Insight'}</span>
                              </div>
                              <p className="text-sm">{insight.content}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {Math.round(insight.confidence * 100)}% confidence
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(insight.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDismissInsight(insight.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memories Tab */}
          <TabsContent value="memories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Memories</CardTitle>
                <CardDescription>
                  Search through stored memories using semantic similarity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search memories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={isLoading}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant={selectedType === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedType(null)}
                  >
                    All
                  </Button>
                  {['pattern', 'insight', 'interaction', 'preference'].map((type) => (
                    <Button
                      key={type}
                      variant={selectedType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType(type)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>

                {/* Results */}
                <ScrollArea className="h-[400px]">
                  {filteredMemories.length === 0 ? (
                    <div className="text-center py-12">
                      <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No memories found' : 'Search to view memories'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredMemories.map((memory) => (
                        <div
                          key={memory.id}
                          className="p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Badge className={getTypeColor(memory.type)}>
                              {memory.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {memory.timestamp.toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{memory.content}</p>
                          {memory.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              {memory.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Patterns</CardTitle>
                <CardDescription>
                  Recurring behaviors and preferences detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Pattern visualization coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
