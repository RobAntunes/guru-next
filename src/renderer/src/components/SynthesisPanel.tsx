import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Atom,
  Sparkles,
  GitBranch,
  Zap,
  Code,
  FileCode,
  Play,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Layers,
  Brain,
  Activity,
  Download,
  Copy,
  ChevronDown,
  ChevronRight,
  Info,
  History,
  Settings
} from 'lucide-react';
import {
  synthesisEngine,
  SynthesisRequest,
  SynthesisResult,
  SynthesisInsight,
  GeneratedWork,
  IntegrationPoint,
  ProjectDirection,
  MissingPiece
} from '../services/synthesis-engine';
// TODO: Import sandbox service when implemented
// import { sandboxService } from '../services/sandbox-service';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SynthesisPanelProps {
  knowledgeBaseId: string;
  selectedGroupIds?: string[];
  selectedDocumentIds?: string[];
  onIntegrationRequest?: (integration: IntegrationPoint) => void;
  onPreferencesChange?: (preferences: Record<string, boolean>) => void;
}

export const SynthesisPanel: React.FC<SynthesisPanelProps> = ({
  knowledgeBaseId,
  selectedGroupIds,
  selectedDocumentIds,
  onIntegrationRequest,
  onPreferencesChange
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<SynthesisInsight | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['preferences']));
  const [synthesisProgress, setSynthesisProgress] = useState(0);

  // Synthesis preferences that guide the AI
  const [synthesisPreferences, setSynthesisPreferences] = useState({
    patterns: true,
    features: true,
    architecture: false,
    roadmap: false,
    gaps: true,
    opportunities: true
  });

  // Mock synthesis history
  const [synthesisHistory] = useState([
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000),
      type: 'patterns',
      documentCount: 5,
      insightCount: 3,
      trigger: 'AI initiated'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 7200000),
      type: 'features',
      documentCount: 8,
      insightCount: 5,
      trigger: 'User requested'
    }
  ]);

  const startSynthesis = async (type: 'patterns' | 'features' | 'architecture' | 'roadmap' | 'gaps' | 'opportunities' | 'full') => {
    setIsProcessing(true);
    setSynthesisProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSynthesisProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const request: SynthesisRequest = {
        knowledgeBaseId,
        groupIds: selectedGroupIds,
        documentIds: selectedDocumentIds,
        synthesisType: type,
        targetLanguage: 'typescript',
        projectContext: {
          framework: 'React',
          architecture: 'Component-based'
        }
      };

      const result = await synthesisEngine.synthesize(request);
      clearInterval(progressInterval);
      setSynthesisProgress(100);
      setSynthesisResult(result);

      if (result.insights.length > 0) {
        setSelectedInsight(result.insights[0]);
      }
    } catch (error) {
      console.error('Synthesis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const downloadWork = (work: GeneratedWork) => {
    const blob = new Blob([work.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthesis-${work.id}.${work.format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const togglePreference = (pref: keyof typeof synthesisPreferences) => {
    const newPreferences = {
      ...synthesisPreferences,
      [pref]: !synthesisPreferences[pref]
    };
    setSynthesisPreferences(newPreferences);
    onPreferencesChange?.(newPreferences);
  };

  // Update preferences on mount
  useEffect(() => {
    onPreferencesChange?.(synthesisPreferences);
  }, []);

  const getEnabledCount = () => {
    return Object.values(synthesisPreferences).filter(v => v).length;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Knowledge Synthesis</h3>
          <Badge variant="outline" className="text-xs">
            <Atom className="h-3 w-3 mr-1" />
            MCP Tool
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Configure synthesis preferences to guide the AI assistant
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 gap-1 bg-muted/50 p-1 rounded-md">
          <TabsTrigger
            value="config"
            className="data-[state=active]:!bg-background data-[state=active]:!text-foreground data-[state=active]:!shadow-sm"
          >
            <Settings className="h-3 w-3 mr-1" />
            Configuration
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:!bg-background data-[state=active]:!text-foreground data-[state=active]:!shadow-sm"
          >
            <History className="h-3 w-3 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Tab Subtitle */}
          <p className="text-xs text-muted-foreground">
            Configure which synthesis types the AI should focus on when analyzing your documents
          </p>
          {/* Info Box */}
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>The AI can synthesize knowledge from your documents when you ask questions like:</p>
                  <ul className="ml-4 space-y-0.5">
                    <li>• "What patterns exist in my documents?"</li>
                    <li>• "Suggest new features based on my knowledge base"</li>
                    <li>• "Find gaps in my documentation"</li>
                  </ul>
                  <p className="mt-2">Enable synthesis types below to guide what the AI focuses on.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Synthesis Preferences */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-normal">Synthesis Preferences</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {getEnabledCount()} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Pattern Finding */}
              <div className="flex items-start justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pattern Finding</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Discover recurring themes and patterns across documents
                    </p>
                  </div>
                </div>
                <Switch
                  checked={synthesisPreferences.patterns}
                  onCheckedChange={() => togglePreference('patterns')}
                />
              </div>

              {/* Feature Generation */}
              <div className="flex items-start justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Feature Ideas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generate new feature suggestions from existing knowledge
                    </p>
                  </div>
                </div>
                <Switch
                  checked={synthesisPreferences.features}
                  onCheckedChange={() => togglePreference('features')}
                />
              </div>

              {/* Architecture Analysis */}
              <div className="flex items-start justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Architecture Design</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create architectural proposals from technical documents
                    </p>
                  </div>
                </div>
                <Switch
                  checked={synthesisPreferences.architecture}
                  onCheckedChange={() => togglePreference('architecture')}
                />
              </div>

              {/* Roadmap Generation */}
              <div className="flex items-start justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Roadmap Planning</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Build development roadmaps from project insights
                    </p>
                  </div>
                </div>
                <Switch
                  checked={synthesisPreferences.roadmap}
                  onCheckedChange={() => togglePreference('roadmap')}
                />
              </div>

              {/* Gap Analysis */}
              <div className="flex items-start justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Gap Analysis</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Identify missing pieces and documentation gaps
                    </p>
                  </div>
                </div>
                <Switch
                  checked={synthesisPreferences.gaps}
                  onCheckedChange={() => togglePreference('gaps')}
                />
              </div>

              {/* Opportunity Discovery */}
              <div className="flex items-start justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Opportunity Discovery</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Find new opportunities and unexplored directions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={synthesisPreferences.opportunities}
                  onCheckedChange={() => togglePreference('opportunities')}
                />
              </div>
            </CardContent>
          </Card>

       </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Tab Subtitle */}
          <p className="text-xs text-muted-foreground">
            View past synthesis activities performed by the AI assistant
          </p>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-normal">Recent Synthesis Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {synthesisHistory.map(item => (
                    <div key={item.id} className="p-3 bg-muted/20 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.type === 'patterns' && <Brain className="h-3 w-3 text-muted-foreground" />}
                          {item.type === 'features' && <Sparkles className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-xs font-medium capitalize">{item.type} Synthesis</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.trigger}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{item.documentCount} documents</span>
                        <span>•</span>
                        <span>{item.insightCount} insights</span>
                        <span>•</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results would appear here when AI performs synthesis */}
      {synthesisResult && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Insights Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('insights')}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Generated Insights</span>
                <Badge variant="secondary" className="text-xs">
                  {synthesisResult.insights.length}
                </Badge>
              </div>
              {expandedSections.has('insights') ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>

            {expandedSections.has('insights') && (
              <div className="p-3 pt-0 space-y-2">
                {synthesisResult.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`p-2 rounded-md cursor-pointer transition-colors ${selectedInsight?.id === insight.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-muted/20 hover:bg-muted/30'
                      }`}
                    onClick={() => setSelectedInsight(insight)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {insight.summary}
                        </p>
                      </div>
                      {insight.actionable && (
                        <Badge variant="outline" className="text-xs ml-2">
                          Actionable
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {insight.patterns.length} patterns
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(insight.generatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generated Code Section */}
          {synthesisResult.generatedWork.length > 0 && (
            <div className="border rounded-lg">
              <button
                onClick={() => toggleSection('code')}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Generated Code</span>
                  <Badge variant="secondary" className="text-xs">
                    {synthesisResult.generatedWork.length}
                  </Badge>
                </div>
                {expandedSections.has('code') ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>

              {expandedSections.has('code') && (
                <div className="p-3 pt-0 space-y-3">
                  {synthesisResult.generatedWork.map((code) => (
                    <div key={code.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium">{code.purpose}</p>
                        <div className="flex items-center gap-1">
                          {code.sandboxResult?.error ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          ) : code.sandboxResult ? (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Tested
                            </Badge>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyCode(code.code)}
                            className="h-6 px-2"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadCode(code)}
                            className="h-6 px-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-md overflow-hidden text-xs">
                        <SyntaxHighlighter
                          language={code.language}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '0.5rem',
                            fontSize: '0.75rem',
                            maxHeight: '200px'
                          }}
                        >
                          {code.code}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Integration Points */}
          {synthesisResult.suggestedIntegrations.length > 0 && (
            <div className="border rounded-lg">
              <button
                onClick={() => toggleSection('integrations')}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Integration Points</span>
                  <Badge variant="secondary" className="text-xs">
                    {synthesisResult.suggestedIntegrations.length}
                  </Badge>
                </div>
                {expandedSections.has('integrations') ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>

              {expandedSections.has('integrations') && (
                <div className="p-3 pt-0 space-y-2">
                  {synthesisResult.suggestedIntegrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="p-2 bg-muted/20 rounded-md space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium">{integration.targetFile}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {integration.suggestedChanges}
                          </p>
                        </div>
                        <Badge
                          variant={
                            integration.impact === 'high' ? 'destructive' :
                              integration.impact === 'medium' ? 'default' :
                                'secondary'
                          }
                          className="text-xs"
                        >
                          {integration.impact}
                        </Badge>
                      </div>
                      {integration.automated && onIntegrationRequest && (
                        <Button
                          size="sm"
                          onClick={() => onIntegrationRequest(integration)}
                          className="h-6 text-xs w-full"
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Apply Integration
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Learning Outcomes */}
          {synthesisResult.learningOutcomes.length > 0 && (
            <div className="p-3 bg-muted/20 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs font-medium">Learning Outcomes</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Recorded {synthesisResult.learningOutcomes.length} patterns for future synthesis
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};