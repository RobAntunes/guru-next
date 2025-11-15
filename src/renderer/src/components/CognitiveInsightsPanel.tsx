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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stats', 'activity']));
  const [groups, setGroups] = useState<DocumentGroup[]>([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    activeDocuments: 0,
    totalGroups: 0,
    lastUpdate: new Date(),
    categoryCounts: {} as Record<string, number>
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
      const categoryCounts: Record<string, number> = {};

      flatGroups.forEach(group => {
        group.documents?.forEach((docRef: any) => {
          if (docRef.membership?.isActive) {
            activeCount++;
          }
        });
      });

      // Count documents by category
      documents.forEach(doc => {
        const category = doc.category || 'uncategorized';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      setStats({
        totalDocuments: documents.length,
        activeDocuments: activeCount,
        totalGroups: flatGroups.length,
        lastUpdate: new Date(),
        categoryCounts
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
    <div className="h-full flex flex-col space-y-4 overflow-y-auto p-4">
      {/* Knowledge Base Stats */}
      <Card className="shrink-0 border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader 
          className="cursor-pointer flex flex-row items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-t-lg"
          onClick={() => toggleSection('stats')}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">Statistics</CardTitle>
          </div>
          {expandedSections.has('stats') ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </CardHeader>
        
        {expandedSections.has('stats') && (
          <CardContent className="p-4 pt-0 space-y-3">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium">Total</span>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {stats.totalDocuments}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium">Groups</span>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {stats.totalGroups}
                </Badge>
              </div>
            </div>

            {/* Category Breakdown */}
            {Object.keys(stats.categoryCounts).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">By Category</div>
                {Object.entries(stats.categoryCounts).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                    <span className="text-xs capitalize">{category}</span>
                    <Badge variant="outline" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Document Groups */}
      <Card className="shrink-0 border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-t-lg"
          onClick={() => toggleSection('groups')}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Network className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">Document Groups</CardTitle>
          </div>
          {expandedSections.has('groups') ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </CardHeader>

        {expandedSections.has('groups') && (
          <CardContent className="p-4 pt-0 max-h-60 overflow-y-auto">
            {groups.length > 0 ? (
              <div className="space-y-2">
                {groups.slice(0, 5).map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-2 min-w-0">
                      <Network className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium truncate">{group.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {group.documents?.length || 0}
                    </Badge>
                  </div>
                ))}
                {groups.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{groups.length - 5} more groups
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No document groups yet
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recent Activity */}
      <Card className="shrink-0 border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-t-lg"
          onClick={() => toggleSection('activity')}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">Recent Documents</CardTitle>
          </div>
          {expandedSections.has('activity') ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </CardHeader>

        {expandedSections.has('activity') && (
          <CardContent className="p-4 pt-0 max-h-60 overflow-y-auto">
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-start space-x-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <FileText className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No documents yet
              </p>
            )}
          </CardContent>
        )}
      </Card>

    </div>
  );
};
