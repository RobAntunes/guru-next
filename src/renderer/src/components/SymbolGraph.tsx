/**
 * Enhanced Symbol Graph - Multi-source symbol visualization with mind map
 * Supports: Codebase browsing, Knowledge context, and Current project
 */

import React, { useState, useEffect } from 'react'
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
  Folder,
  Network,
  List,
  FolderOpen,
  Database as DatabaseIcon,
  GitBranch,
  ExternalLink
} from 'lucide-react'
import { SymbolMindMap } from './SymbolMindMap'
import { Symbol, SymbolRelationship, parseCodeWithTreeSitter } from '../utils/tree-sitter-parser'
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

type ViewMode = 'list' | 'mindmap'
type TabType = 'codebase' | 'knowledge' | 'project'

export function SymbolGraph() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('codebase')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [files, setFiles] = useState<FileNode[]>([])
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [relationships, setRelationships] = useState<SymbolRelationship[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentCode, setCurrentCode] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null)
  const [navigationHistory, setNavigationHistory] = useState<Symbol[]>([])

  useEffect(() => {
    analytics.trackPageView('symbol_graph')
    // Load current project symbols if available
    loadCurrentProjectSymbols()
  }, [])

  const loadCurrentProjectSymbols = async () => {
    try {
      // TODO: Get current project from project storage
      // For now, just track the intent
      analytics.track('symbol_graph_project_check')
    } catch (error) {
      console.error('Failed to load project symbols:', error)
    }
  }

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
        console.warn('File system API not available - using demo data')
        loadDemoData()
        return
      }

      const structure = await (window as any).api.filesystem.readDirectory(path)
      setFiles(structure)
      await parseAllFiles(structure)
    } catch (error) {
      console.error('Failed to load directory:', error)
      analytics.trackError(error as Error, 'symbol_graph_load')
      // Load demo data as fallback
      loadDemoData()
    } finally {
      setIsLoading(false)
    }
  }

  const loadDemoData = () => {
    // Demo symbols for testing
    const demoSymbols: Symbol[] = [
      {
        id: 'demo:1',
        name: 'parseCodeWithTreeSitter',
        type: 'function',
        signature: 'async function parseCodeWithTreeSitter(code: string, filePath: string)',
        location: { file: 'tree-sitter-parser.ts', line: 50, column: 0, endLine: 60, endColumn: 1 },
        references: ['demo:2', 'demo:3'],
        referencedBy: []
      },
      {
        id: 'demo:2',
        name: 'TreeSitterParser',
        type: 'class',
        signature: 'class TreeSitterParser',
        location: { file: 'tree-sitter-parser.ts', line: 10, column: 0, endLine: 45, endColumn: 1 },
        references: [],
        referencedBy: ['demo:1']
      },
      {
        id: 'demo:3',
        name: 'Symbol',
        type: 'interface',
        signature: 'interface Symbol',
        location: { file: 'tree-sitter-parser.ts', line: 5, column: 0, endLine: 8, endColumn: 1 },
        references: [],
        referencedBy: ['demo:1']
      },
      {
        id: 'demo:4',
        name: 'SymbolMindMap',
        type: 'function',
        signature: 'function SymbolMindMap(props: SymbolMindMapProps)',
        location: { file: 'SymbolMindMap.tsx', line: 20, column: 0, endLine: 100, endColumn: 1 },
        references: ['demo:3'],
        referencedBy: []
      }
    ]

    const demoRelationships: SymbolRelationship[] = [
      { from: 'demo:1', to: 'demo:2', type: 'calls' },
      { from: 'demo:1', to: 'demo:3', type: 'references' },
      { from: 'demo:4', to: 'demo:3', type: 'references' }
    ]

    setSymbols(demoSymbols)
    setRelationships(demoRelationships)
  }

  const parseAllFiles = async (nodes: FileNode[]) => {
    const allSymbols: Symbol[] = []
    const allRelationships: SymbolRelationship[] = []

    const processNode = async (node: FileNode) => {
      if (node.type === 'file' && isCodeFile(node.path)) {
        try {
          if ((window as any).api?.filesystem?.readFile) {
            const code = await (window as any).api.filesystem.readFile(node.path)
            const result = await parseCodeWithTreeSitter(code, node.path)
            allSymbols.push(...result.symbols)
            allRelationships.push(...result.relationships)
            node.symbols = result.symbols
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
    setRelationships(allRelationships)
    analytics.trackSymbolGraph('analyzed', { symbolCount: allSymbols.length })
  }

  const isCodeFile = (path: string): boolean => {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c']
    return codeExtensions.some((ext) => path.endsWith(ext))
  }

  const handleFileClick = async (node: FileNode) => {
    if (node.type === 'file' && node.code) {
      setCurrentCode(node.code)
      if (node.symbols) {
        setSymbols(node.symbols)
      }
      analytics.trackSymbolGraph('file_selected', { file: node.path })
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

  const handleSymbolClick = (symbol: Symbol) => {
    setSelectedSymbol(symbol)
    // Only add to history if it's different from the last symbol
    const lastSymbol = navigationHistory[navigationHistory.length - 1]
    if (!lastSymbol || lastSymbol.id !== symbol.id) {
      setNavigationHistory([...navigationHistory, symbol])
    }
    analytics.trackSymbolGraph('symbol_selected', { symbolId: symbol.id })
  }

  const handleFollowReference = (fromId: string, toId: string) => {
    const targetSymbol = symbols.find((s) => s.id === toId)
    if (targetSymbol) {
      handleSymbolClick(targetSymbol)
      analytics.trackSymbolGraph('followed_reference', { from: fromId, to: toId })
    }
  }

  const handleGoToDefinition = (symbolId: string) => {
    const symbol = symbols.find((s) => s.id === symbolId)
    if (symbol) {
      handleSymbolClick(symbol)
      // TODO: Open file at location
      analytics.trackSymbolGraph('go_to_definition', { symbolId })
    }
  }

  const filteredSymbols = symbols.filter((symbol) => {
    const matchesSearch =
      !searchQuery ||
      symbol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      symbol.signature?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !selectedType || symbol.type === selectedType

    // If a symbol is selected, only show symbols in the same code path
    if (selectedSymbol) {
      const isInCodePath =
        symbol.id === selectedSymbol.id || // The selected symbol itself
        selectedSymbol.references?.includes(symbol.id) || // Symbols it references
        symbol.references?.includes(selectedSymbol.id) || // Symbols that reference it
        selectedSymbol.referencedBy?.includes(symbol.id) || // Symbols that reference it
        symbol.referencedBy?.includes(selectedSymbol.id) || // Symbols referenced by it
        relationships.some(
          (rel) =>
            (rel.from === selectedSymbol.id && rel.to === symbol.id) ||
            (rel.to === selectedSymbol.id && rel.from === symbol.id)
        )

      return matchesSearch && matchesType && isInCodePath
    }

    return matchesSearch && matchesType
  })

  const getSymbolIcon = (type: string) => {
    switch (type) {
      case 'function':
      case 'method':
        return '𝑓'
      case 'class':
        return 'C'
      case 'interface':
        return 'I'
      case 'type':
        return 'T'
      case 'variable':
      case 'property':
        return 'V'
      case 'import':
        return '→'
      case 'export':
        return '←'
      default:
        return '•'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'function':
      case 'method':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'class':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'interface':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'type':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'variable':
      case 'property':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
      case 'import':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const exportSymbols = () => {
    const data = JSON.stringify({ symbols: filteredSymbols, relationships }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'symbols.json'
    a.click()
    analytics.trackSymbolGraph('exported', { count: filteredSymbols.length })
  }

  const renderFileTree = (nodes: FileNode[], depth: number = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: `${depth * 12}px` }}>
        {node.type === 'directory' ? (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-8 hover:bg-accent"
              onClick={() => toggleDirectory(node.path)}
            >
              {expandedDirs.has(node.path) ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <Folder className="h-3 w-3 mr-2 text-amber-500" />
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
            className="w-full justify-start text-left h-8 hover:bg-accent"
            onClick={() => handleFileClick(node)}
          >
            <File className="h-3 w-3 mr-2 ml-4 text-blue-500" />
            <span className="truncate">{node.name}</span>
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
              Interactive code visualization with mind map and navigation
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === 'mindmap' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mindmap')}
                className="gap-2"
              >
                <Network className="h-4 w-4" />
                Mind Map
              </Button>
            </div>

            {!selectedPath && activeTab === 'codebase' && (
              <Button onClick={handleSelectDirectory} variant="outline">
                <FolderOpen className="mr-2 h-4 w-4" />
                Select Directory
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="codebase" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Codebase Browser
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-2">
              <DatabaseIcon className="h-4 w-4" />
              Knowledge Context
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Current Project
            </TabsTrigger>
          </TabsList>

          {/* Codebase Tab */}
          <TabsContent value="codebase" className="space-y-6">
            {!selectedPath && symbols.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileCode className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No directory selected</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                    Select a directory to analyze its code structure, or view demo symbols below
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleSelectDirectory} variant="outline">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Select Directory
                    </Button>
                    <Button onClick={loadDemoData} variant="outline">
                      <FileCode className="mr-2 h-4 w-4" />
                      Load Demo Data
                    </Button>
                  </div>
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
                        {symbols.filter((s) => s.type === 'function' || s.type === 'method').length}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Classes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {symbols.filter((s) => s.type === 'class').length}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Relationships</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{relationships.length}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* View Content */}
                {viewMode === 'mindmap' ? (
                  <SymbolMindMap
                    symbols={symbols}
                    relationships={relationships}
                    onSymbolClick={handleSymbolClick}
                    onFollowReference={handleFollowReference}
                  />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* File Tree */}
                    {files.length > 0 && (
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
                    )}

                    {/* Symbols List */}
                    <Card className={files.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Symbols</CardTitle>
                            <CardDescription>{filteredSymbols.length} symbols</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewMode('mindmap')}
                            >
                              <Network className="h-4 w-4 mr-2" />
                              View Mind Map
                            </Button>
                            <Button variant="outline" size="sm" onClick={exportSymbols}>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Search and Filter */}
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search symbols..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>

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

                        {/* Navigation Breadcrumbs */}
                        {navigationHistory.length > 0 && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-lg overflow-x-auto whitespace-nowrap">
                            <span className="text-muted-foreground shrink-0">Path:</span>
                            <div className="flex items-center gap-2 overflow-x-auto">
                              {navigationHistory.slice(-5).map((sym, idx) => (
                                <React.Fragment key={sym.id}>
                                  {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                                  <button
                                    onClick={() => handleGoToDefinition(sym.id)}
                                    className="hover:underline shrink-0 truncate max-w-[150px]"
                                    title={sym.name}
                                  >
                                    {sym.name}
                                  </button>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Symbols List */}
                        <ScrollArea className="h-[500px]">
                          <div className="space-y-2">
                            {filteredSymbols.map((symbol) => (
                              <div
                                key={symbol.id}
                                className={`p-3 rounded-lg border-2 bg-card hover:bg-accent/50 transition-colors cursor-pointer ${
                                  selectedSymbol?.id === symbol.id
                                    ? 'border-primary shadow-md'
                                    : 'border-transparent'
                                }`}
                                onClick={() => handleSymbolClick(symbol)}
                              >
                                <div className="flex items-start gap-3">
                                  <Badge className={`${getTypeColor(symbol.type)} font-mono border`}>
                                    {getSymbolIcon(symbol.type)}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium font-mono text-sm flex items-center gap-2">
                                      {symbol.name}
                                      {(symbol.references?.length || 0) > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          {symbol.references?.length} refs
                                        </Badge>
                                      )}
                                    </div>
                                    {symbol.signature && (
                                      <div className="text-xs text-muted-foreground font-mono mt-1 truncate">
                                        {symbol.signature}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                      <span>{symbol.location.file.split('/').pop()}</span>
                                      <span>•</span>
                                      <span>Line {symbol.location.line}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleGoToDefinition(symbol.id)
                                        }}
                                        className="ml-auto text-primary hover:underline flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        Go to
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {filteredSymbols.length === 0 && (
                              <div className="text-center py-12 text-muted-foreground">
                                No symbols found matching your criteria
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Knowledge Context Tab */}
          <TabsContent value="knowledge" className="space-y-6">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DatabaseIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Knowledge Context Symbols</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  This will show symbols extracted from your Knowledge Bases, including PDFs, documentation, and code snippets
                </p>
                <Badge variant="secondary">Coming Soon</Badge>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Current Project Tab */}
          <TabsContent value="project" className="space-y-6">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Current Project Symbols</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                  Automatically analyzes symbols from your currently selected project in Project Management
                </p>
                <Badge variant="secondary">Coming Soon</Badge>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
