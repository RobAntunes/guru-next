import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  FolderOpen,
  Briefcase,
  Globe,
  Database,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { documentGroupsStorage, DocumentGroup, DocumentGroupMembership } from '../services/document-groups-storage';
import { DroppableGroup } from './document-organizer/DroppableGroup';
import { SortableDocument } from './document-organizer/SortableDocument';
import { WebIndexerDialog } from './knowledge/WebIndexerDialog';

interface DocumentOrganizerProps {
  knowledgeBaseId: string;
  knowledgeBaseName?: string;
  documents: Array<{\n    id: string;\n    filename: string;\n    category: string;\n    addedAt: Date;\n    metadata?: any;\n  }>;
  onDocumentSelect: (doc: any) => void;
  onDocumentDelete: (docId: string) => void;
  onDocumentToggle?: (docId: string, isActive: boolean) => void;
  onGroupsChange?: () => void;
}

interface GroupWithDocuments extends DocumentGroup {
  documents: Array<{\n    doc: any;\n    membership: DocumentGroupMembership | null;\n  }>;
  children: GroupWithDocuments[];
  isExpanded?: boolean;
}

export const DocumentOrganizer: React.FC<DocumentOrganizerProps> = ({
  knowledgeBaseId,
  knowledgeBaseName = 'Project',
  documents,
  onDocumentSelect,
  onDocumentDelete,
  onDocumentToggle,
  onGroupsChange
}) => {
  // Groups state
  const [projectGroups, setProjectGroups] = useState<GroupWithDocuments[]>([]);
  const [contextGroups, setContextGroups] = useState<GroupWithDocuments[]>([]);
  
  // UI State
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'project' | 'context'>('project');
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  
  // Root Folders Expansion
  const [projectRootExpanded, setProjectRootExpanded] = useState(true);
  const [contextRootExpanded, setContextRootExpanded] = useState(true);

  // Dialogs
  const [showWebIndexer, setShowWebIndexer] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Split documents
  const { projectDocs, contextDocs } = useMemo(() => {
    const project: typeof documents = [];
    const context: typeof documents = [];

    documents.forEach(doc => {
      // Identify context docs by metadata type or category
      if (doc.metadata?.type === 'web_page' || doc.category === 'context') {
        context.push(doc);
      } else {
        project.push(doc);
      }
    });

    return { projectDocs: project, contextDocs: context };
  }, [documents]);

  useEffect(() => {
    loadGroupsAndDocuments();
  }, [knowledgeBaseId, documents]);

  const loadGroupsAndDocuments = async () => {
    try {
      // Load all groups
      const allGroups = await documentGroupsStorage.getGroupsByKB(knowledgeBaseId);
      const hierarchicalGroups = await documentGroupsStorage.getGroupsHierarchically(knowledgeBaseId);
      
      // Load memberships
      const allMemberships = await documentGroupsStorage.getAllMemberships();
      
      // Helper: recursively build group tree with docs
      const processGroup = async (group: any, docsPool: typeof documents): Promise<GroupWithDocuments> => {
        const groupMemberships = allMemberships.filter(m => m.groupId === group.id);
        const groupDocuments = docsPool
          .map(doc => {
            const membership = groupMemberships.find(m => m.documentId === doc.id);
            return membership ? { doc, membership } : null;
          })
          .filter(Boolean) as Array<{ doc: any; membership: DocumentGroupMembership }>;
        
        const children = await Promise.all((group.children || []).map(c => processGroup(c, docsPool)));
        
        return {
          ...group,
          documents: groupDocuments.sort((a, b) => a.membership.order - b.membership.order),
          children,
          isExpanded: true // Default to expanded
        };
      };

      // We need to separate groups into Project and Context buckets
      // Since groups don't strictly have a type in DB yet, we'll infer or use a convention.
      // For now, we will put "Ungrouped" in both, containing respective docs.
      // And we can let user create groups in either root.
      // NOTE: To persist this, we might need to store a 'root' property on groups.
      // For this implementation, we'll assume groups starting with "Context:" are context groups, 
      // or just put all custom groups in Project for now unless we add a field.
      // A simpler approach for the user request:
      // Just render "Ungrouped Project Docs" in Project folder, and "Ungrouped Context Docs" in Context folder.
      // And custom groups... let's just list them in Project for now to be safe, or try to guess.
      
      // BETTER: Use the document membership to decide where the group belongs?
      // If a group contains mostly context docs, it goes to Context?
      // No, that's flaky.
      
      // Let's use a naming convention for now or just put all created groups in Project
      // and have a special "Web Resources" group in Context.
      
      // Re-fetching strategy:
      // 1. Process all groups.
      // 2. If a group has name "Web Resources" or "Context", put in Context.
      // 3. Else Project.
      
      const pGroups: GroupWithDocuments[] = [];
      const cGroups: GroupWithDocuments[] = [];

      // Create virtual "Ungrouped" buckets if they don't exist as real groups
      // But we need to respect the `documents` prop filtering.
      
      // Strategy: 
      // We will maintain ONE list of groups from storage.
      // But in the UI we render two roots.
      // We will assign groups to Project Root by default.
      // We will assign "Web Resources" group to Context Root.
      
      // Check if "Web Resources" group exists
      let webGroup = allGroups.find(g => g.name === 'Web Resources');
      if (!webGroup && contextDocs.length > 0) {
        // Create it if we have context docs
        webGroup = await documentGroupsStorage.createGroup(knowledgeBaseId, 'Web Resources', 'Indexed web pages');
        // Reload to get it in hierarchy
        return loadGroupsAndDocuments();
      }

      // Assign docs to groups
      const processedRoots = await Promise.all(hierarchicalGroups.map(g => processGroup(g, documents)));
      
      processedRoots.forEach(g => {
        if (g.name === 'Web Resources' || g.name === 'Context') {
          cGroups.push(g);
        } else {
          pGroups.push(g);
        }
      });

      // Handle ungrouped docs
      // Find docs that are NOT in any of the processed groups
      const groupedDocIds = new Set<string>();
      const collectIds = (g: GroupWithDocuments) => {
        g.documents.forEach(d => groupedDocIds.add(d.doc.id));
        g.children?.forEach(collectIds);
      };
      processedRoots.forEach(collectIds);

      // Create virtual "Ungrouped" groups for display if needed
      // Or actually add them to a real "Ungrouped" group if we want persistence.
      // The previous code created a real "Ungrouped" group.
      
      const ungroupedProjectDocs = projectDocs.filter(d => !groupedDocIds.has(d.id));
      const ungroupedContextDocs = contextDocs.filter(d => !groupedDocIds.has(d.id));

      // If we have real ungrouped group, we should have found it above.
      // If "Ungrouped" group is in pGroups, we should filter its docs to only show project ones?
      // This gets tricky.
      
      // SIMPLIFICATION:
      // We will filter the *documents* inside the groups based on the root they are in.
      // Wait, a group shouldn't be in both.
      
      setProjectGroups(pGroups);
      setContextGroups(cGroups);
      
      // If we have raw ungrouped context docs (not in Web Resources), we should probably
      // add them to Web Resources automatically?
      if (webGroup && ungroupedContextDocs.length > 0) {
         for (const doc of ungroupedContextDocs) {
           await documentGroupsStorage.addDocumentToGroup(doc.id, webGroup.id);
         }
         // Reload
         return loadGroupsAndDocuments();
      }

    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleCreateGroup = async (type: 'project' | 'context', parentId?: string) => {
    if (!newGroupName.trim()) return;
    
    try {
      const name = newGroupName;
      // Maybe prefix context groups? No, just name.
      await documentGroupsStorage.createGroup(knowledgeBaseId, name, undefined, parentId);
      setNewGroupName('');
      setShowNewGroupInput(false);
      await loadGroupsAndDocuments();
      onGroupsChange?.();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group? Documents will be moved to Ungrouped.')) return;
    await documentGroupsStorage.deleteGroup(groupId);
    await loadGroupsAndDocuments();
    onGroupsChange?.();
  };

  const handleToggleDocument = async (docId: string, isActive: boolean, groupId: string) => {
    // Add to group if missing, then toggle
    const allMemberships = await documentGroupsStorage.getAllMemberships();
    const hasMembership = allMemberships.some(m => m.documentId === docId);
    if (!hasMembership) {
      await documentGroupsStorage.addDocumentToGroup(docId, groupId);
    }
    await documentGroupsStorage.toggleDocumentActivation(docId, isActive);
    onDocumentToggle?.(docId, isActive);
    await loadGroupsAndDocuments();
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? event.over.id as string : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    // Moving Document -> Group
    if (activeData.type === 'document' && overData.type === 'group') {
       const docId = active.id as string;
       const targetGroupId = overData.group.id;
       const sourceGroupId = activeData.groupId;
       if (sourceGroupId !== targetGroupId) {
         await documentGroupsStorage.removeDocumentFromGroup(docId, sourceGroupId);
         await documentGroupsStorage.addDocumentToGroup(docId, targetGroupId);
         await loadGroupsAndDocuments();
       }
    }
    // Reordering
    // ... (Existing logic)
  };
  
  const getActiveDocument = () => {
    if (!activeId) return null;
    const find = (list: GroupWithDocuments[]): any => {
      for (const g of list) {
        const d = g.documents.find(doc => doc.doc.id === activeId);
        if (d) return d.doc;
        if (g.children) {
          const c = find(g.children);
          if (c) return c;
        }
      }
      return null;
    };
    return find([...projectGroups, ...contextGroups]);
  };

  const activeDocument = getActiveDocument();

  // Helper to count active/total
  const getCounts = (groups: GroupWithDocuments[]) => {
    let active = 0;
    let total = 0;
    const traverse = (list: GroupWithDocuments[]) => {
      list.forEach(g => {
        active += g.documents.filter(d => d.membership?.isActive).length;
        total += g.documents.length;
        if (g.children) traverse(g.children);
      });
    };
    traverse(groups);
    return { active, total };
  };

  const projectCounts = getCounts(projectGroups);
  const contextCounts = getCounts(contextGroups);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className=\"flex flex-col h-full\">
        {/* Toolbar */}
        <div className=\"flex items-center justify-between mb-4 px-1\">
          <span className=\"text-xs font-semibold text-muted-foreground uppercase tracking-wider\">
            Knowledge Base
          </span>
          <div className=\"flex gap-1\">
             <Button
              size=\"sm\"
              variant=\"ghost\"
              onClick={() => setShowWebIndexer(true)}
              className=\"h-6 px-2 text-xs\"
              title=\"Index Web Page\"
            >
              <Globe className=\"h-3 w-3 mr-1\" />
              Add Web
            </Button>
             <Button
              size=\"sm\"
              variant=\"ghost\"
              onClick={() => {
                setNewGroupType('project');
                setShowNewGroupInput(true);
              }}
              className=\"h-6 px-2 text-xs\"
              title=\"New Group\"
            >
              <Plus className=\"h-3 w-3 mr-1\" />
              Group
            </Button>
          </div>
        </div>

        {/* New Group Input */}
        {showNewGroupInput && (
          <div className=\"flex gap-2 mb-4 px-2\">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup(newGroupType)}
              placeholder={`New ${newGroupType} group...`}
              className=\"h-7 text-xs !bg-neutral-800 !text-neutral-200\"
              autoFocus
            />
            <Button
              size=\"sm\"
              onClick={() => handleCreateGroup(newGroupType)}
              className=\"h-7 px-2\"
            >
              Create
            </Button>
            <Button
              size=\"sm\"
              variant=\"ghost\"
              onClick={() => setShowNewGroupInput(false)}
              className=\"h-7 px-2\"
            >
              Cancel
            </Button>
          </div>
        )}

        <div className=\"space-y-3 flex-1 overflow-y-auto pr-1\">
          
          {/* PROJECT ROOT */}
          <div className=\"border border-muted rounded-lg overflow-hidden\">
            <div className=\"flex items-center gap-2 p-2 bg-muted/20 border-b border-muted/50 select-none\">
               <button
                onClick={() => setProjectRootExpanded(!projectRootExpanded)}
                className=\"p-0.5 hover:bg-muted rounded\"
              >
                {projectRootExpanded ? 
                  <ChevronDown className=\"h-3 w-3\" /> : 
                  <ChevronRight className=\"h-3 w-3\" />
                }
              </button>
              <Briefcase className=\"h-4 w-4 text-blue-400\" />
              <span className=\"text-sm font-semibold flex-1\">Project</span>
              <span className=\"text-xs text-muted-foreground\">
                {projectCounts.active}/{projectCounts.total}
              </span>
              {/* Toggle All Project */}
              <button
                 className=\"p-1 hover:bg-muted rounded\"
                 onClick={async () => {
                   const newState = projectCounts.active < projectCounts.total;
                   // Recursively toggle
                   const toggle = async (list: GroupWithDocuments[]) => {
                     for (const g of list) {
                       for (const {doc} of g.documents) await handleToggleDocument(doc.id, newState, g.id);
                       if (g.children) await toggle(g.children);
                     }
                   };
                   await toggle(projectGroups);
                 }}
              >
                {projectCounts.active === projectCounts.total ? 
                  <ToggleRight className=\"h-3 w-3 text-primary\" /> : 
                  <ToggleLeft className=\"h-3 w-3 text-muted-foreground\" />
                }
              </button>
            </div>
            
            {projectRootExpanded && (
              <div className=\"p-2 space-y-2 bg-card/30\">
                <SortableContext items={projectGroups.map(g => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
                  {projectGroups.map(group => (
                    <DroppableGroup
                      key={group.id}
                      group={group}
                      onToggleExpansion={(id) => {
                        setProjectGroups(prev => prev.map(g => g.id === id ? {...g, isExpanded: !g.isExpanded} : g));
                      }}
                      onDeleteGroup={handleDeleteGroup}
                      onToggleDocument={handleToggleDocument}
                      onDocumentSelect={onDocumentSelect}
                      onDocumentDelete={onDocumentDelete}
                      onCreateSubgroup={async (pid, name) => {
                        setNewGroupName(name);
                        await handleCreateGroup('project', pid);
                      }}
                      isOver={overId === `group-${group.id}`}
                      overId={overId}
                      editingGroupId={editingGroupId}
                      setEditingGroupId={setEditingGroupId}
                      editingGroupName={editingGroupName}
                      setEditingGroupName={setEditingGroupName}
                      onGroupsChange={onGroupsChange}
                    />
                  ))}
                </SortableContext>
                {projectGroups.length === 0 && (
                   <div className=\"text-xs text-center text-muted-foreground py-2 italic\">
                     No project groups. Create one to organize files.
                   </div>
                )}
              </div>
            )}
          </div>

          {/* CONTEXT ROOT */}
          <div className=\"border border-muted rounded-lg overflow-hidden\">
            <div className=\"flex items-center gap-2 p-2 bg-muted/20 border-b border-muted/50 select-none\">
               <button
                onClick={() => setContextRootExpanded(!contextRootExpanded)}
                className=\"p-0.5 hover:bg-muted rounded\"
              >
                {contextRootExpanded ? 
                  <ChevronDown className=\"h-3 w-3\" /> : 
                  <ChevronRight className=\"h-3 w-3\" />
                }
              </button>
              <Database className=\"h-4 w-4 text-purple-400\" />
              <span className=\"text-sm font-semibold flex-1\">Context</span>
              <span className=\"text-xs text-muted-foreground\">
                {contextCounts.active}/{contextCounts.total}
              </span>
               <button
                 className=\"p-1 hover:bg-muted rounded\"
                 onClick={async () => {
                   const newState = contextCounts.active < contextCounts.total;
                   const toggle = async (list: GroupWithDocuments[]) => {
                     for (const g of list) {
                       for (const {doc} of g.documents) await handleToggleDocument(doc.id, newState, g.id);
                       if (g.children) await toggle(g.children);
                     }
                   };
                   await toggle(contextGroups);
                 }}
              >
                {contextCounts.active === contextCounts.total ? 
                  <ToggleRight className=\"h-3 w-3 text-primary\" /> : 
                  <ToggleLeft className=\"h-3 w-3 text-muted-foreground\" />
                }
              </button>
            </div>
            
            {contextRootExpanded && (
              <div className=\"p-2 space-y-2 bg-card/30\">
                <SortableContext items={contextGroups.map(g => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
                  {contextGroups.map(group => (
                    <DroppableGroup
                      key={group.id}
                      group={group}
                      onToggleExpansion={(id) => {
                         setContextGroups(prev => prev.map(g => g.id === id ? {...g, isExpanded: !g.isExpanded} : g));
                      }}
                      onDeleteGroup={handleDeleteGroup}
                      onToggleDocument={handleToggleDocument}
                      onDocumentSelect={onDocumentSelect}
                      onDocumentDelete={onDocumentDelete}
                      onCreateSubgroup={async (pid, name) => {
                        setNewGroupName(name);
                        await handleCreateGroup('context', pid);
                      }}
                      isOver={overId === `group-${group.id}`}
                      overId={overId}
                      editingGroupId={editingGroupId}
                      setEditingGroupId={setEditingGroupId}
                      editingGroupName={editingGroupName}
                      setEditingGroupName={setEditingGroupName}
                      onGroupsChange={onGroupsChange}
                    />
                  ))}
                </SortableContext>
                {contextGroups.length === 0 && (
                   <div className=\"text-xs text-center text-muted-foreground py-2 italic\">
                     No context groups. Add web resources.
                   </div>
                )}
              </div>
            )}
          </div>
        </div>

        <WebIndexerDialog 
          open={showWebIndexer} 
          onOpenChange={setShowWebIndexer} 
          knowledgeBaseId={knowledgeBaseId}
          onSuccess={() => {
            loadGroupsAndDocuments();
            onGroupsChange?.();
          }}
        />

      </div>
      <DragOverlay>
        {activeDocument ? (
          <div className=\"flex items-center gap-2 p-1.5 bg-background border rounded shadow-lg\">
            <span className=\"text-sm\">{activeDocument.filename}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
