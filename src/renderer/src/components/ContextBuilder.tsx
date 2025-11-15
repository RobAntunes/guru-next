/**
 * ContextBuilder - Intelligent context preparation for LLMs
 * 
 * Features:
 * - Auto-select relevant files based on query/task
 * - Traverse dependency graph for complete context
 * - Smart chunking to fit token budgets
 * - Export to Claude/ChatGPT/Cursor formats
 */

import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { FileCode, Hash, Sparkles, Send, Download, Settings, X, Plus } from 'lucide-react'
import { estimateTokens } from '../utils/token-counter'
import { memoryStorage } from '../services/memory-storage'
import { analytics } from '../services/analytics'

interface ContextFile {
  path: string
  content: string
  fileType: 'code' | 'document' | 'config'
  relevance: number
  symbols?: string[]
  tokens: number
}

interface ContextConfig {
  maxTokens: number
  model: 'gpt-4' | 'claude-3-5' | 'cursor' | 'chatgpt'
  format: 'standard' | 'cursor' | 'claude'
  includeDependencies: boolean
  includeTests: boolean
  includeDocs: boolean
}

export function ContextBuilder() {
  const [query, setQuery] = useState('')
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedContext, setGeneratedContext] = useState('')
  const [config, setConfig] = useState<ContextConfig>({
    maxTokens: 128000,
    model: 'claude-3-5',
    format: 'claude',
    includeDependencies: true,
    includeTests: false,
    includeDocs: true
  })
  const [totalTokens, setTotalTokens] = useState(0)

  useEffect(() => {
    analytics.trackPageView('context_builder')
    loadRecentMemories()
  }, [])

  useEffect(() => {
    const tokens = contextFiles.reduce((sum, file) => sum + file.tokens, 0)
    setTotalTokens(tokens)
  }, [contextFiles])

  const loadRecentMemories = async () => {
    try {
      // Load recent project from memory
      const memories = await memoryStorage.search('project', 5)
      if (memories.length > 0) {
        setSelectedRepo(memories[0].metadata?.path || '')
      }
    } catch (error) {
      console.error('Failed to load recent memories:', error)
    }
  }

  const handleBuildContext = async () => {
    if (!query.trim() || !selectedRepo) {
      alert('Please enter a query and select a repository')
      return
    }

    setIsLoading(true)
    try {
      const files = await autoSelectFiles(query, selectedRepo)
      setContextFiles(files)
      
      analytics.track('context_built', {
        query,
        fileCount: files.length,
        totalTokens: files.reduce((sum, f) => sum + f.tokens, 0)
      })
    } catch (error) {
      console.error('Failed to build context:', error)
      analytics.trackError(error as Error, 'context_build')
    } finally {
      setIsLoading(false)
    }
  }

  const autoSelectFiles = async (userQuery: string, repoPath: string): Promise<ContextFile[]> => {
    const selectedFiles: ContextFile[] = []

    try {
      // Step 1: Search for semantically related files
      const searchResults = await searchFiles(userQuery, repoPath)
      
      // Step 2: Extract mentioned symbols and search for those
      const mentionedSymbols = extractSymbolsFromQuery(userQuery)
      const symbolResults = await searchSymbols(mentionedSymbols, repoPath)
      
      // Step 3: Find related files via dependency graph (if enabled)
      let dependencyFiles: ContextFile[] = []
      if (config.includeDependencies) {
        dependencyFiles = await findDependencyFiles(symbolResults.map(f => f.path))
      }

      // Step 4: Combine and rank files
      const allFiles = [...searchResults, ...symbolResults, ...dependencyFiles]
      const rankedFiles = rankByRelevance(allFiles, userQuery)

      // Step 5: Select top files that fit within token budget
      return selectFilesWithinBudget(rankedFiles, config.maxTokens)
    } catch (error) {
      console.error('Error in autoSelectFiles:', error)
      return []
    }
  }

  const searchFiles = async (query: string, repoPath: string): Promise<ContextFile[]> => {
    if (!window.api?.file?.getDirectoryFiles) {
      console.warn('File system API not available')
      return []
    }

    try {
      const result = await window.api.file.getDirectoryFiles(repoPath, true)
      if (!result.success || !result.data) return []

      // Filter code files
      const codeFiles = result.data.filter(f => 
        !f.isDirectory && 
        ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'].some(ext => f.path.endsWith(ext))
      )

      // Load file contents and calculate relevance
      const files: ContextFile[] = []
      for (const fileInfo of codeFiles.slice(0, 50)) { // Limit to prevent overload
        try {
          const contentResult = await window.api.file.readContent(fileInfo.path)
          if (contentResult.success && contentResult.data) {
            const content = contentResult.data
            const relevance = calculateRelevance(query, content)
            const tokens = estimateTokens(content)
            
            files.push({
              path: fileInfo.path,
              content,
              fileType: 'code',
              relevance,
              tokens
            })
          }
        } catch (error) {
          console.error(`Failed to read ${fileInfo.path}:`, error)
        }
      }

      return files.sort((a, b) => b.relevance - a.relevance)
    } catch (error) {
      console.error('Error searching files:', error)
      return []
    }
  }

  const extractSymbolsFromQuery = (query: string): string[] => {
    // Extract function names, class names, variable mentions
    const functionPattern = /\b(\w+)\(\)/g
    const classPattern = /\b([A-Z][a-zA-Z]*)\b/g
    
    const functions = Array.from(query.matchAll(functionPattern)).map(m => m[1])
    const classes = Array.from(query.matchAll(classPattern)).map(m => m[1])
    
    return [...new Set([...functions, ...classes])]
  }

  const searchSymbols = async (symbols: string[], repoPath: string): Promise<ContextFile[]> => {
    if (symbols.length === 0) return []
    
    try {
      // For now, search for files containing symbol names
      const keyword = symbols.join(' ')
      return searchFiles(keyword, repoPath)
    } catch (error) {
      console.error('Error searching symbols:', error)
      return []
    }
  }

  const findDependencyFiles = async (filePaths: string[]): Promise<ContextFile[]> => {
    // Basic dependency resolution - for now, just return empty
    // TODO: Implement proper import/require tracking
    return []
  }

  const calculateRelevance = (query: string, content: string): number => {
    // Simple keyword matching relevance score
    const keywords = query.toLowerCase().split(/\s+/)
    const contentLower = content.toLowerCase()
    
    let score = 0
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        score += 1
        // Bonus for appearing in comments or important sections
        if (contentLower.includes('//' + keyword) || contentLower.includes('* ' + keyword)) {
          score += 0.5
        }
      }
    })
    
    return score / keywords.length
  }

  const rankByRelevance = (files: ContextFile[], query: string): ContextFile[] => {
    return files.sort((a, b) => b.relevance - a.relevance)
  }

  const selectFilesWithinBudget = (files: ContextFile[], maxTokens: number): ContextFile[] => {
    const selected: ContextFile[] = []
    let currentTokens = 0
    
    for (const file of files) {
      if (currentTokens + file.tokens <= maxTokens * 0.8) { // Leave 20% buffer
        selected.push(file)
        currentTokens += file.tokens
      } else {
        break
      }
    }
    
    return selected
  }

  const handleExport = () => {
    if (contextFiles.length === 0) {
      alert('No context to export. Build context first.')
      return
    }

    const context = generateContextString()
    setGeneratedContext(context)
    
    // Download as file
    const blob = new Blob([context], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `context-${Date.now()}.md`
    a.click()
    
    analytics.track('context_exported', {
      fileCount: contextFiles.length,
      totalTokens: contextFiles.reduce((sum, f) => sum + f.tokens, 0),
      format: config.format
    })
  }

  const handleCopyToClipboard = () => {
    if (!generatedContext) {
      alert('No context generated yet. Build and export first.')
      return
    }
    
    navigator.clipboard.writeText(generatedContext).then(() => {
      analytics.track('context_copied')
    })
  }

  const generateContextString = (): string => {
    let context = `# Context for: ${query}\n\n`
    context += `Generated at: ${new Date().toISOString()}\n\n`
    context += `## Configuration\n`
    context += `- Model: ${config.model}\n`
    context += `- Max Tokens: ${config.maxTokens}\n`
    context += `- Files Included: ${contextFiles.length}\n`
    context += `- Total Tokens: ${contextFiles.reduce((sum, f) => sum + f.tokens, 0)}\n\n`
    context += '---\n\n'

    // Generate based on format
    if (config.format === 'claude') {
      // Claude format with <file> tags
      contextFiles.forEach(file => {
        const relativePath = file.path.replace(selectedRepo, '').replace(/^\//, '')
        context += `<file path="${relativePath}">\n\n`
        context += file.content
        context += '\n\n</file>\n\n'
      })
    } else if (config.format === 'cursor') {
      // Cursor format with special comments
      context += '\n```\n'
      contextFiles.forEach(file => {
        const relativePath = file.path.replace(selectedRepo, '').replace(/^\//, '')
        context += `// File: ${relativePath}\n`
        context += file.content
        context += '\n\n'
      })
      context += '\n```\n'
    } else {
      // Standard markdown format
      contextFiles.forEach(file => {
        const relativePath = file.path.replace(selectedRepo, '').replace(/^\//, '')
        context += `## File: ${relativePath}\n\n`
        context += "```\n"
        context += file.content
        context += "\n```\n\n"
      })
    }

    return context
  }

  const addFileManually = () => {
    if (!window.api?.file?.openFileDialog) return
    
    window.api.file.openFileDialog({ multiple: false }).then((result: any) => {
      if (result.success && result.data && result.data.length > 0) {
        const filePath = result.data[0]
        window.api?.file?.readContent(filePath).then((contentResult: any) => {
          if (contentResult.success && contentResult.data) {
            const newFile: ContextFile = {
              path: filePath,
              content: contentResult.data,
              fileType: 'code',
              relevance: 1.0,
              tokens: estimateTokens(contentResult.data)
            }
            setContextFiles([...contextFiles, newFile])
          }
        })
      }
    })
  }

  const removeFile = (index: number) => {
    setContextFiles(contextFiles.filter((_, i) => i !== index))
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Intelligent Context Builder</h1>
          <p className="text-muted-foreground">
            Build optimized context for AI assistants by auto-selecting relevant files
          </p>
        </div>

        {/* Query and Repository Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Task Description</CardTitle>
            <CardDescription>
              Describe what you're trying to accomplish or ask the AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g., Fix the bug in the authentication flow, or Explain how the caching system works..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
            />
            
            <div className="flex gap-4">
              <Input
                placeholder="Repository path (e.g., /Users/me/project)"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
              />
              <Button 
                variant="secondary"
              onClick={() => {
                if (window.api?.file?.openFolderDialog) {
                  window.api.file.openFolderDialog().then((result: any) => {
                    if (result.success && result.data) {
                      setSelectedRepo(result.data)
                    }
                  })
                }
              }}>
                Browse
              </Button>
            </div>

            <Button 
            variant="secondary"
              onClick={handleBuildContext}
              disabled={isLoading || !query.trim() || !selectedRepo}
              className="w-full"
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isLoading ? 'Analyzing...' : 'Build Context'}
            </Button>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <CardTitle>Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">AI Model</label>
                <Select value={config.model} onValueChange={(value: any) => setConfig({...config, model: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="claude-3-5">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="cursor">Cursor</SelectItem>
                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Output Format</label>
                <Select value={config.format} onValueChange={(value: any) => setConfig({...config, format: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Markdown</SelectItem>
                    <SelectItem value="claude">Claude ({'<file>'} tags)</SelectItem>
                    <SelectItem value="cursor">Cursor (special format)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Max Tokens ({config.maxTokens.toLocaleString()})</label>
                <input 
                  type="range" 
                  min="16000" 
                  max="128000" 
                  step="4000" 
                  value={config.maxTokens}
                  onChange={(e) => setConfig({...config, maxTokens: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={config.includeDependencies}
                    onChange={(e) => setConfig({...config, includeDependencies: e.target.checked})}
                  />
                  <span className="text-sm">Include dependency files</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={config.includeTests}
                    onChange={(e) => setConfig({...config, includeTests: e.target.checked})}
                  />
                  <span className="text-sm">Include test files</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={config.includeDocs}
                    onChange={(e) => setConfig({...config, includeDocs: e.target.checked})}
                  />
                  <span className="text-sm">Include documentation</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Files */}
        {contextFiles.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Selected Files ({contextFiles.length})</CardTitle>
                  <CardDescription>
                    Total tokens: {totalTokens.toLocaleString()} / {config.maxTokens.toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addFileManually}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add File
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contextFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-md">
                          {file.path.split('/').pop()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {file.path}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        <Hash className="h-3 w-3 mr-1" />
                        {file.tokens.toLocaleString()}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setContextFiles([])}>
                  Clear All
                </Button>
                <Button onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Context
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {generatedContext && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Context (Preview)</CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                  <Send className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4 max-h-96 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {generatedContext.substring(0, 2000)}{generatedContext.length > 2000 ? '...' : ''}
                </pre>
              </div>
              {generatedContext.length > 2000 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Preview truncated. Full context exported to file.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}