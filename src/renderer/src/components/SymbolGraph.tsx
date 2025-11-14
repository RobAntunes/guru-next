/**
 * Symbol Graph - Code parsing and symbol visualization
 */

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import {
  Code,
  FileCode,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  File,
  Folder
} from 'lucide-react'
import { parseCode, Symbol, calculateComplexity } from '../utils/code-parser'
import { TokenCounter, ContextWindowIndicator } from './ui/token-counter'
import { estimateTokens } from '../utils/token-counter'
import { analytics } from '../services/analytics'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  symbols?: Symbol[]
  code?: string
}

export function SymbolGraph() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [files, setFiles] = useState<FileNode[]>([])
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentCode, setCurrentCode] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  useEffect(() => {
    analytics.trackPageView('symbol_graph')
  }, [])

  const handleSelectDirectory = async () => {
    try {
      if (!(window as any).api?.dialog?.selectDirectory) {
        alert('File system API not available yet. This feature requires main process implementation.')
        return
      }

      const result = await (window as any).api.dialog.selectDirectory()
      if (result) {
        setSelectedPath(result)
        await loadDirectoryStructure(result)
        analytics.trackSymbolGraph('opened', { path: result })
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
      analytics.trackError(error as Error, 'symbol_graph_select')
      alert('Failed to select directory: ' + (error as Error).message)
    }
  }

  const loadDirectoryStructure = async (path: string) => {
    setIsLoading(true)
    try {
      if (!(window as any).api?.filesystem?.readDirectory) {
        console.warn('File system API not available')
        return
      }

      // This would need to be implemented in the main process
      const structure = await (window as any).api.filesystem.readDirectory(path)
      setFiles(structure)

      // Parse all code files
      await parseAllFiles(structure)
    } catch (error) {
      console.error('Failed to load directory:', error)
      analytics.trackError(error as Error, 'symbol_graph_load')
      alert('Failed to load directory: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const parseAllFiles = async (nodes: FileNode[]) => {
    const allSymbols: Symbol[] = []

    const processNode = async (node: FileNode) => {
      if (node.type === 'file' && isCodeFile(node.path)) {
        try {
          if ((window as any).api?.filesystem?.readFile) {
            const code = await (window as any).api.filesystem.readFile(node.path)
            const fileSymbols = parseCode(code, node.path)
            allSymbols.push(...fileSymbols)
            node.symbols = fileSymbols
            node.code = code
          }
        } catch (error) {
          console.error(`Failed to parse ${node.path}:`, error)
        }
      } else if (node.type === 'directory' && node.children) {
        for (const child of node.children) {
          await processNode(child)
        }
      }
    }

    for (const node of nodes) {
      await processNode(node)
    }

    setSymbols(allSymbols)
    analytics.trackSymbolGraph('analyzed', { fileCount: allSymbols.length })
  }

  const isCodeFile = (path: string): boolean => {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c']
    return codeExtensions.some(ext => path.endsWith(ext))
  }

  const handleFileClick = async (node: FileNode) => {
    if (node.type === 'file' && node.code) {
      setCurrentCode(node.code)
      if (node.symbols) {
        setSymbols(node.symbols)
      }
      analytics.trackSymbolGraph('filtered', { file: node.path })
    }
  }

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }

  const filteredSymbols = symbols.filter(symbol => {
    const matchesSearch = !searchQuery ||
      symbol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      symbol.signature?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !selectedType || symbol.type === selectedType
    return matchesSearch && matchesType
  })

  const getSymbolIcon = (type: string) => {
    switch (type) {
      case 'function': return '𝑓'
      case 'class': return 'C'
      case 'interface': return 'I'
      case 'type': return 'T'
      case 'variable': return 'V'
      case 'import': return '→'
      case 'export': return '←'
      default: return '•'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'function': return 'bg-blue-500/10 text-blue-500'
      case 'class': return 'bg-purple-500/10 text-purple-500'
      case 'interface': return 'bg-green-500/10 text-green-500'
      case 'type': return 'bg-amber-500/10 text-amber-500'
      case 'variable': return 'bg-cyan-500/10 text-cyan-500'
      case 'import': return 'bg-gray-500/10 text-gray-500'
      default: return 'bg-gray-500/10 text-gray-500'
    }
  }

  const exportSymbols = () => {
    const data = JSON.stringify(filteredSymbols, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'symbols.json'
    a.click()
    analytics.trackSymbolGraph('exported', { count: filteredSymbols.length })
  }

  const renderFileTree = (nodes: FileNode[], depth: number = 0) => {
    return nodes.map(node => (
      <div key={node.path} style={{ paddingLeft: `${depth * 12}px` }}>
        {node.type === 'directory' ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-8"
              onClick={() => toggleDirectory(node.path)}
            >
              {expandedDirs.has(node.path) ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <Folder className="h-3 w-3 mr-2" />
              {node.name}
            </Button>
            {expandedDirs.has(node.path) && node.children && (
              <div>{renderFileTree(node.children, depth + 1)}</div>
            )}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-left h-8"
            onClick={() => handleFileClick(node)}
          >
            <File className="h-3 w-3 mr-2 ml-4" />
            {node.name}
            {node.symbols && node.symbols.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {node.symbols.length}
              </Badge>
            )}
          </Button>
        )}
      </div>
    ))
  }

  const complexity = currentCode ? calculateComplexity(currentCode) : null
  const totalTokens = symbols.reduce((sum, s) => sum + estimateTokens(s.signature || ''), 0)

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-light tracking-tight flex items-center gap-2">
              <Code className="h-8 w-8" />
              Symbol Graph
            </h2>
            <p className="text-muted-foreground mt-1">
              Code parsing and symbol visualization for your codebase
            </p>
          </div>
          {!selectedPath && (
            <Button onClick={handleSelectDirectory}>
              <Folder className="mr-2 h-4 w-4" />
              Select Directory
            </Button>
          )}
        </div>

        {!selectedPath ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileCode className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No directory selected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a directory to analyze its code structure and symbols
              </p>
              <Button onClick={handleSelectDirectory}>
                <Folder className="mr-2 h-4 w-4" />
                Select Directory
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Symbols Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{symbols.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Functions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {symbols.filter(s => s.type === 'function').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {symbols.filter(s => s.type === 'class').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* File Tree */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Files</CardTitle>
                  <CardDescription>Browse code files</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      renderFileTree(files)
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Symbols List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Symbols</CardTitle>
                      <CardDescription>{filteredSymbols.length} symbols</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportSymbols}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search and Filter */}
                  <div className="space-y-3">
                    <Input
                      placeholder="Search symbols..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant={selectedType === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedType(null)}
                      >
                        All
                      </Button>
                      {['function', 'class', 'interface', 'type'].map((type) => (
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
                  </div>

                  {/* Complexity Metrics */}
                  {complexity && (
                    <Card className="bg-muted/50">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Complexity:</span>
                            <span className="ml-2 font-medium">{complexity.cyclomaticComplexity}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">LOC:</span>
                            <span className="ml-2 font-medium">{complexity.linesOfCode}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Token Counter */}
                  {currentCode && (
                    <ContextWindowIndicator tokens={estimateTokens(currentCode)} />
                  )}

                  {/* Symbols List */}
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {filteredSymbols.map((symbol) => (
                        <div
                          key={symbol.id}
                          className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <Badge className={`${getTypeColor(symbol.type)} font-mono`}>
                              {getSymbolIcon(symbol.type)}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium font-mono text-sm">{symbol.name}</div>
                              {symbol.signature && (
                                <div className="text-xs text-muted-foreground font-mono mt-1 truncate">
                                  {symbol.signature}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>{symbol.location.file.split('/').pop()}</span>
                                <span>•</span>
                                <span>Line {symbol.location.line}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
