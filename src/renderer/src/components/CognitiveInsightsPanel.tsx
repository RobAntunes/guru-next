/**
 * Simplified Cognitive Insights Panel
 * Shows only essential context information without AI synthesis
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Network,
  FileText,
  Database,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UnifiedContextGraph } from './UnifiedContextGraph';
import { documentGroupsStorage, DocumentGroup } from '../services/document-groups-storage';

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

export const CognitiveInsightsPanel: React.FC<CognitiveInsightsPanelProps> = ({
  knowledgeBaseId,
  documents,
  knowledgeBase,
  onDocumentToggle
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['graph', 'stats']));
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    activeDocuments: 0,
    totalGroups: 0,
    lastUpdate: new Date()
  });

  useEffect(() => {
    if (knowledgeBaseId) {
      loadData();
    }
  }, [knowledgeBaseId, documents]);

  const loadData = async () => {
    if (!knowledgeBaseId) return;
    
    try {
      const hierarchicalGroups = await documentGroupsStorage.getGroupsHierarchically(knowledgeBaseId);
      
      // Flatten groups
      const flattenGroups = (groups: any[], result: any[] = []): any[] => {
        groups.forEach(group => {
          result.push(group);
          if (group.children) {
            flattenGroups(group.children, result);
          }
        });
        return result;
      };
      
      const flatGroups = flattenGroups(hierarchicalGroups);
      setGroups(flatGroups);

      // Calculate stats
      let activeCount = 0;
      flatGroups.forEach(group => {
        group.documents?.forEach((docRef: any) => {
          if (docRef.membership?.isActive) {
            activeCount++;
          }
        });
      });

      setStats({
        totalDocuments: documents.length,
        activeDocuments: activeCount,
        totalGroups: flatGroups.length,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col space-y-3 overflow-y-auto p-3">
      {/* Knowledge Base Stats */}
      <Card className="shrink-0">
        <CardHeader 
          className="cursor-pointer flex flex-row items-center justify-between p-3"
          onClick={() => toggleSection('stats')}
        >
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <CardTitle className="text-sm">Knowledge Base Stats</CardTitle>
          </div>
          {expandedSections.has('stats') ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </CardHeader>
        
        {expandedSections.has('stats') && (
          <CardContent className="space-y-2 p-3 pt-0">
            {knowledgeBase && (
              <>
                <div className="pb-2">
                  <div className="text-sm font-medium">{knowledgeBase.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{knowledgeBase.description}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Total Docs</div>
                      <div className="text-sm font-medium">{stats.totalDocuments}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Active</div>
                      <div className="text-sm font-medium">{stats.activeDocuments}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-purple-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Groups</div>
                      <div className="text-sm font-medium">{stats.totalGroups}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <div>
                      <div className="text-xs text-muted-foreground">Updated</div>
                      <div className="text-xs font-medium">
                        {new Date(knowledgeBase.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {!knowledgeBase && (
              <div className="text-sm text-muted-foreground">
                No knowledge base selected
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Context Graph */}
      {expandedSections.has('graph') ? (
        <Card className="flex-1 min-h-[300px] flex flex-col">
          <CardHeader 
            className="cursor-pointer flex flex-row items-center justify-between shrink-0 p-3"
            onClick={() => toggleSection('graph')}
          >
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4" />
              <CardTitle className="text-sm">Context Overview</CardTitle>
            </div>
            <ChevronUp className="w-4 h-4" />
          </CardHeader>
          
          <CardContent className="flex-1 min-h-0 p-3 pt-0 overflow-y-auto max-h-[400px]">
            <div className="w-full" style={{ height: '600px' }}>
              <UnifiedContextGraph 
                knowledgeGroups={groups}
                onToggleNode={onDocumentToggle}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shrink-0">
          <CardHeader 
            className="cursor-pointer flex flex-row items-center justify-between p-3"
            onClick={() => toggleSection('graph')}
          >
            <div className="flex items-center space-x-2">
              <Network className="w-4 h-4" />
              <CardTitle className="text-sm">Context Overview</CardTitle>
            </div>
            <ChevronDown className="w-4 h-4" />
          </CardHeader>
        </Card>
      )}

      {/* Quick Info */}
      <Card className="shrink-0">
        <CardHeader className="p-3">
          <CardTitle className="text-sm">Context Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total Items</span>
            <Badge variant="outline" className="text-xs bg-black text-white border-blue-200">
              {stats.totalDocuments + stats.totalGroups}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Inactive</span>
            <Badge variant="outline" className="text-xs bg-black text-white border-gray-200">
              {stats.totalDocuments - stats.activeDocuments}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
