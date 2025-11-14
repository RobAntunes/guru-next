import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Network,
  Atom,
  TrendingUp,
  Brain,
  Target,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Sparkles,
  BookOpen,
  Zap,
  AlertCircle,
  CheckCircle,
  Activity,
  Layers,
  FileText,
  Database,
  Clock,
  FolderOpen,
  ArrowRight,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { documentGroupsStorage, DocumentGroup } from '../services/document-groups-storage';
import { specStorage } from '../services/spec-storage';
import { SynthesisPanel } from './SynthesisPanel';
import { UnifiedContextGraph } from './UnifiedContextGraph';
import { ToolManagementPanel } from './ToolManagementPanel';
import { contextGraphService } from '../services/context-graph-service';

interface CognitiveInsightsPanelProps {
  knowledgeBaseId?: string;
  documents: any[];
  knowledgeBase?: {
    name: string;
    description: string;
    documentCount: number;
    chunkCount: number;
    lastUpdated: string;
  };
  onDocumentToggle?: () => void;
}

interface PanelSection {
  id: string;
  title: string;
  icon: React.ElementType;
  defaultExpanded: boolean;
}

const sections: PanelSection[] = [
  { id: 'graph', title: 'Global Context Overview', icon: Network, defaultExpanded: true },
  { id: 'synthesis', title: 'Synthesis Manager', icon: Atom, defaultExpanded: true },
  { id: 'tools', title: 'Tool Management', icon: Brain, defaultExpanded: true },
  { id: 'cognitive', title: 'Cognition', icon: Brain, defaultExpanded: false },
  { id: 'actions', title: 'Action Intelligence', icon: Target, defaultExpanded: false }
];

export const CognitiveInsightsPanel: React.FC<CognitiveInsightsPanelProps> = ({
  knowledgeBaseId,
  documents,
  knowledgeBase,
  onDocumentToggle
}) => {
  const [synthesisPreferences, setSynthesisPreferences] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.filter(s => s.defaultExpanded).map(s => s.id))
  );
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [groupMemberships, setGroupMemberships] = useState<Map<string, { groupId: string; isActive: boolean }>>(new Map());

  useEffect(() => {
    if (knowledgeBaseId) {
      loadGroups();
    }
    loadSpecs();
  }, [knowledgeBaseId, documents]);

  const loadGroups = async () => {
    if (!knowledgeBaseId) return;
    
    try {
      const hierarchicalGroups = await documentGroupsStorage.getGroupsHierarchically(knowledgeBaseId);
      
      // Flatten groups for storage but keep hierarchy info
      const flattenGroups = (groups: any[], result: any[] = []): any[] => {
        groups.forEach(group => {
          result.push(group);
          if (group.children) {
            flattenGroups(group.children, result);
          }
        });
        return result;
      };
      
      setGroups(flattenGroups(hierarchicalGroups));
      
      // Load memberships to map documents to groups
      const allMemberships = await documentGroupsStorage.getAllMemberships();
      const membershipMap = new Map<string, { groupId: string; isActive: boolean }>();
      allMemberships.forEach(m => {
        membershipMap.set(m.documentId, { groupId: m.groupId, isActive: m.isActive });
      });
      setGroupMemberships(membershipMap);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadSpecs = async () => {
    try {
      const allSpecs = await specStorage.getAllSpecs();
      
      // Calculate stats by category
      const byCategory: Record<string, number> = {};
      allSpecs.forEach(spec => {
        byCategory[spec.category] = (byCategory[spec.category] || 0) + 1;
      });
      
      // Update spec context in the graph service
      contextGraphService.updateSpecContext({
        specs: allSpecs.map(spec => ({
          id: spec.id,
          name: spec.name,
          category: spec.category,
          status: spec.status,
          immutable: spec.immutable,
          parentSpecId: spec.parentSpecId,
          relatedSpecs: spec.relatedSpecs
        })),
        totalSpecs: allSpecs.length,
        activeSpecs: allSpecs.filter(s => s.status === 'active').length,
        byCategory
      });
    } catch (error) {
      console.error('Failed to load specs:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderUnifiedContextGraph = () => {
    return (
      <UnifiedContextGraph
        knowledgeGroups={groups}
        onToggleNode={async (nodeId, active) => {
          // Handle node toggles from the graph
          if (nodeId.startsWith('doc-')) {
            const docId = nodeId.replace('doc-', '');
            await documentGroupsStorage.toggleDocumentActivation(docId, active);
            await loadGroups();
            onDocumentToggle?.();
          }
        }}
      />
    );
  };

  const renderKnowledgeGraph = () => {
    // Group documents by their groups
    const documentsByGroup = new Map<string, any[]>();
    
    // Initialize with all groups
    groups.forEach(group => {
      documentsByGroup.set(group.id, []);
    });
    
    // Assign documents to groups
    documents.forEach(doc => {
      const membership = groupMemberships.get(doc.id);
      if (membership && documentsByGroup.has(membership.groupId)) {
        documentsByGroup.get(membership.groupId)!.push({
          ...doc,
          isActive: membership.isActive
        });
      }
    });
    
    // Get active documents count
    const activeDocs = documents.filter(doc => {
      const membership = groupMemberships.get(doc.id);
      return membership?.isActive || false;
    });

    // Render groups recursively
    const renderGroupHierarchy = (groupList: any[], level = 0, parentIndex?: number) => {
      return groupList.map((group, groupIndex) => {
        const groupDocs = documentsByGroup.get(group.id) || [];
        const isLast = groupIndex === groupList.length - 1;
        
        return (
          <div key={group.id} className="relative" style={{ marginLeft: `${level * 20}px` }}>
            {/* Branch Line */}
            {level > 0 && (
              <>
                <div 
                  className="absolute left-0 top-0 w-px bg-muted-foreground/30"
                  style={{ 
                    height: isLast ? '12px' : '100%',
                    left: '-12px'
                  }}
                />
                <div 
                  className="absolute left-0 top-3 h-px bg-muted-foreground/30"
                  style={{ 
                    width: '12px',
                    left: '-12px'
                  }}
                />
              </>
            )}
            
            {/* Group Node */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={async () => {
                  // Toggle all documents in this group
                  const activeCount = groupDocs.filter(d => d.isActive).length;
                  const newState = activeCount < groupDocs.length; // Activate all if not all are active
                  
                  for (const doc of groupDocs) {
                    await documentGroupsStorage.toggleDocumentActivation(doc.id, newState);
                  }
                  await loadGroups();
                  onDocumentToggle?.();
                }}
                className="p-0.5 hover:bg-muted rounded"
              >
                {groupDocs.filter(d => d.isActive).length === groupDocs.length ? 
                  <ToggleRight className="h-4 w-4 text-primary" /> : 
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                }
              </button>
              <FolderOpen className="h-4 w-4 text-primary/70" />
              <span className="text-sm">{group.name}</span>
              <Badge variant="outline" className="text-xs">
                {groupDocs.filter(d => d.isActive).length}/{groupDocs.length}
              </Badge>
            </div>
            
            {/* Nested Groups */}
            {group.children && group.children.length > 0 && (
              <div className="ml-4">
                {renderGroupHierarchy(group.children, level + 1, groupIndex)}
              </div>
            )}
            
            {/* Documents as Leaves */}
            {groupDocs.length > 0 && (
              <div className="ml-6 space-y-1">
                {groupDocs.slice(0, 3).map((doc, docIndex) => {
                  const isLastDoc = docIndex === Math.min(groupDocs.length - 1, 2);
                  
                  return (
                    <div key={doc.id} className="relative flex items-center gap-2 group/doc">
                      {/* Leaf Line */}
                      <div 
                        className="absolute left-0 top-0 w-px bg-muted-foreground/20"
                        style={{ 
                          height: isLastDoc ? '8px' : '100%',
                          left: '-18px'
                        }}
                      />
                      <div 
                        className="absolute left-0 top-2 h-px bg-muted-foreground/20"
                        style={{ 
                          width: '18px',
                          left: '-18px'
                        }}
                      />
                      
                      <button
                        onClick={async () => {
                          await documentGroupsStorage.toggleDocumentActivation(doc.id, !doc.isActive);
                          await loadGroups();
                          onDocumentToggle?.();
                        }}
                        className="p-0.5 hover:bg-muted rounded opacity-0 group-hover/doc:opacity-100 transition-opacity"
                      >
                        {doc.isActive ? 
                          <ToggleRight className="h-3 w-3 text-primary" /> : 
                          <ToggleLeft className="h-3 w-3 text-muted-foreground" />
                        }
                      </button>
                      <FileText className={`h-3 w-3 ${doc.isActive ? 'text-muted-foreground' : 'text-muted-foreground/40'}`} />
                      <span className={`text-xs truncate max-w-[120px] ${doc.isActive ? 'text-muted-foreground' : 'text-muted-foreground/40 line-through'}`}>
                        {doc.filename}
                      </span>
                    </div>
                  );
                })}
                {groupDocs.length > 3 && (
                  <div className="text-xs text-muted-foreground ml-9">
                    ... +{groupDocs.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        );
      });
    };
    
    return (
      <div className="space-y-4 h-full flex flex-col !text-left">
        {/* Tree Visualization */}
        <div className="min-h-[200px] bg-muted/20 rounded-lg p-4 overflow-auto">
          <div className="space-y-2">
            {/* Root Node */}
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{knowledgeBase?.name || 'Knowledge Base'}</span>
              <Badge variant="secondary" className="text-xs">
                {documents.length} documents
              </Badge>
            </div>
            
            {/* Groups as Branches */}
            <div className="ml-4 space-y-3">
              {(() => {
                // Get only root level groups (no parent)
                const rootGroups = groups.filter(g => !g.parentGroupId);
                return renderGroupHierarchy(rootGroups);
              })()}
            </div>
          </div>
        </div>

        {/* Graph Insights */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <GitBranch className="h-3 w-3 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-light">Knowledge Structure</p>
              <p className="text-xs text-muted-foreground">
                {groups.length} branches organizing {documents.length} documents
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Activity className="h-3 w-3 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-light">Active Knowledge</p>
              <p className="text-xs text-muted-foreground">
                {activeDocs.length} documents actively contributing to insights
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Layers className="h-3 w-3 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-light">Depth Analysis</p>
              <p className="text-xs text-muted-foreground">
                Average {Math.round(documents.length / Math.max(groups.length, 1))} documents per branch
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQuantumSynthesis = () => {
    // Get active group IDs
    const activeGroupIds = groups
      .filter(group => {
        const groupDocs = documents.filter(doc => {
          const membership = groupMemberships.get(doc.id);
          return membership?.groupId === group.id && membership.isActive;
        });
        return groupDocs.length > 0;
      })
      .map(g => g.id);

    return (
      <SynthesisPanel
        knowledgeBaseId={knowledgeBaseId || ''}
        selectedGroupIds={activeGroupIds}
        onIntegrationRequest={(integration) => {
          console.log('Integration requested:', integration);
          // Handle integration request
        }}
        onPreferencesChange={(prefs) => {
          setSynthesisPreferences(prefs);
          // TODO: Pass preferences to AI context
          console.log('Synthesis preferences updated:', prefs);
        }}
      />
    );
  };

  const renderToolManagement = () => (
    <ToolManagementPanel 
      onToolToggle={(toolId, enabled) => {
        console.log(`Tool ${toolId} toggled to ${enabled}`);
        // TODO: Pass this to AI context
      }}
    />
  );

  const renderLearningInsights = () => (
    <div className="space-y-4 h-full flex flex-col">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Learning Velocity</p>
          <div className="flex items-center gap-2">
            <Progress value={75} className="h-1 flex-1" />
            <span className="text-xs">75%</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Concept Mastery</p>
          <div className="flex items-center gap-2">
            <Progress value={82} className="h-1 flex-1" />
            <span className="text-xs">82%</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-light">Recommended Focus Areas</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <p className="text-xs text-muted-foreground">WASM performance optimization</p>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-yellow-600" />
            <p className="text-xs text-muted-foreground">Advanced neural architectures</p>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-muted">
        <p className="text-xs font-light mb-1">Next Learning Objective</p>
        <p className="text-xs text-muted-foreground">
          Explore "Quantum Computing Fundamentals" to deepen understanding of synthesis techniques
        </p>
      </div>
    </div>
  );

  const renderCognitiveAnalysis = () => (
    <div className="space-y-4 h-full flex flex-col">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Coherence</p>
          <div className="flex items-center gap-2">
            <Progress value={87} className="h-1 flex-1" />
            <span className="text-xs">87%</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Completeness</p>
          <div className="flex items-center gap-2">
            <Progress value={62} className="h-1 flex-1" />
            <span className="text-xs">62%</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-light">Harmonic Patterns</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">High concept density in ML documents</p>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Layered complexity in system architecture</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActionIntelligence = () => (
    <div className="space-y-4 h-full flex flex-col">
      <div className="space-y-2">
        <p className="text-xs font-light">Suggested Actions</p>
        <div className="space-y-2">
          <div className="p-2 bg-muted/20 rounded-md">
            <p className="text-xs font-medium mb-1">Consolidate Learning</p>
            <p className="text-xs text-muted-foreground">
              Create summary document linking WASM concepts with ML optimizations
            </p>
          </div>
          <div className="p-2 bg-muted/20 rounded-md">
            <p className="text-xs font-medium mb-1">Explore Gaps</p>
            <p className="text-xs text-muted-foreground">
              Research deployment strategies for quantum-enhanced systems
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-muted">
        <p className="text-xs font-light mb-1">Priority Task</p>
        <p className="text-xs text-muted-foreground">
          Document the harmonic resonance patterns discovered in the current knowledge base
        </p>
      </div>
    </div>
  );

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'graph':
        return renderUnifiedContextGraph();
      case 'synthesis':
        return renderQuantumSynthesis();
      case 'tools':
        return renderToolManagement();
      case 'cognitive':
        return renderCognitiveAnalysis();
      case 'actions':
        return renderActionIntelligence();
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col border-muted overflow-hidden">
      <CardHeader className="pb-4 border-b border-muted">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-normal">Cognitive Insights</CardTitle>
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{documents.length} docs</span>
          </div>
        </div>
        {knowledgeBase && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{new Date(knowledgeBase.lastUpdated).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="space-y-0">
          {sections.map((section) => (
            <div key={section.id} className="border-b border-muted last:border-0">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <section.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{section.title}</span>
                </div>
                {expandedSections.has(section.id) ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              
              {expandedSections.has(section.id) && (
                <div className="px-4 pb-4 pt-4">
                  {renderSectionContent(section.id)}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};