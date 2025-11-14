import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  GripVertical,
  FolderOpen,
  FileText,
  Eye,
  Edit2,
  Check,
  X,
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
  Active,
  Over,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { documentGroupsStorage, DocumentGroup, DocumentGroupMembership } from '../services/document-groups-storage';

interface DocumentOrganizerProps {
  knowledgeBaseId: string;
  documents: Array<{
    id: string;
    filename: string;
    category: string;
    addedAt: Date;
  }>;
  onDocumentSelect: (doc: any) => void;
  onDocumentDelete: (docId: string) => void;
  onDocumentToggle?: (docId: string, isActive: boolean) => void;
  onGroupsChange?: () => void;
}

interface GroupWithDocuments extends DocumentGroup {
  documents: Array<{
    doc: any;
    membership: DocumentGroupMembership | null;
  }>;
  children: GroupWithDocuments[];
  isExpanded?: boolean;
}

// Sortable document item component
function SortableDocument({ 
  doc, 
  membership, 
  groupId,
  onToggle,
  onSelect,
  onDelete 
}: {
  doc: any;
  membership: DocumentGroupMembership | null;
  groupId: string;
  onToggle: (docId: string, isActive: boolean, groupId: string) => void;
  onSelect: (doc: any) => void;
  onDelete: (docId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    over,
  } = useSortable({ 
    id: doc.id,
    data: {
      type: 'document',
      document: doc,
      groupId: groupId
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      {isOver && over?.id === doc.id && (
        <div className="h-0.5 bg-primary rounded-full mx-2 my-1" />
      )}
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors`}
      >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move p-1 hover:bg-muted rounded touch-none"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <FileText className="h-3 w-3 text-muted-foreground" />
      <span className="text-sm flex-1 truncate">{doc.filename}</span>
      <div onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={membership?.isActive ?? true}
          onCheckedChange={(checked) => onToggle(doc.id, checked, groupId)}
          className="scale-75"
        />
      </div>
      <button
        onClick={() => onSelect(doc)}
        className="p-1 hover:bg-muted rounded"
      >
        <Eye className="h-3 w-3" />
      </button>
      <button
        onClick={() => onDelete(doc.id)}
        className="p-1 hover:bg-destructive/20 rounded"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      </div>
    </>
  );
}

// Droppable group component
function DroppableGroup({ 
  group, 
  onToggleExpansion,
  onDeleteGroup,
  onToggleDocument,
  onDocumentSelect,
  onDocumentDelete,
  onCreateSubgroup,
  isOver,
  overId,
  level = 0,
  editingGroupId,
  setEditingGroupId,
  editingGroupName,
  setEditingGroupName,
  onGroupsChange
}: {
  group: GroupWithDocuments;
  onToggleExpansion: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onToggleDocument: (docId: string, isActive: boolean, groupId: string) => void;
  onDocumentSelect: (doc: any) => void;
  onDocumentDelete: (docId: string) => void;
  onCreateSubgroup: (parentGroupId: string, name: string) => Promise<void>;
  isOver: boolean;
  overId?: string | null;
  level?: number;
  editingGroupId: string | null;
  setEditingGroupId: (id: string | null) => void;
  editingGroupName: string;
  setEditingGroupName: (name: string) => void;
  onGroupsChange?: () => void;
}) {
  const {
    setNodeRef,
  } = useSortable({
    id: `group-${group.id}`,
    data: {
      type: 'group',
      group: group
    }
  });

  const [showSubgroupInput, setShowSubgroupInput] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState('');

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg transition-all ${
        isOver ? 'border-primary bg-primary/5 shadow-md' : 'border-muted'
      }`}
      style={{ marginLeft: `${level * 20}px` }}
    >
      {/* Group Header */}
      <div className="group flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors">
        <button
          onClick={() => onToggleExpansion(group.id)}
          className="p-0.5 hover:bg-muted rounded"
        >
          {group.isExpanded ? 
            <ChevronDown className="h-3 w-3" /> : 
            <ChevronRight className="h-3 w-3" />
          }
        </button>
        <FolderOpen className="h-3 w-3 text-muted-foreground" />
        {editingGroupId === group.id ? (
          <Input
            value={editingGroupName}
            onChange={(e) => setEditingGroupName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && editingGroupName.trim()) {
                await documentGroupsStorage.updateGroup(group.id, { name: editingGroupName });
                setEditingGroupId(null);
                setEditingGroupName('');
                onGroupsChange?.();
              } else if (e.key === 'Escape') {
                setEditingGroupId(null);
                setEditingGroupName('');
              }
            }}
            className="h-6 text-sm flex-1 !bg-neutral-800 !text-neutral-200"
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium flex-1">{group.name}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {group.documents.filter(d => d.membership?.isActive).length}/{group.documents.length}
        </span>
        {/* Group Toggle */}
        <button
          onClick={async () => {
            const activeCount = group.documents.filter(d => d.membership?.isActive).length;
            const newState = activeCount < group.documents.length;
            for (const { doc } of group.documents) {
              await onToggleDocument(doc.id, newState, group.id);
            }
          }}
          className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title={group.documents.filter(d => d.membership?.isActive).length === group.documents.length ? "Deactivate all" : "Activate all"}
        >
          {group.documents.filter(d => d.membership?.isActive).length === group.documents.length ? 
            <ToggleRight className="h-3 w-3 text-primary" /> : 
            <ToggleLeft className="h-3 w-3 text-muted-foreground" />
          }
        </button>
        {group.name !== 'Ungrouped' && (
          <>
            <button
              onClick={() => {
                setEditingGroupId(group.id);
                setEditingGroupName(group.name);
              }}
              className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit group name"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => setShowSubgroupInput(true)}
              className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Add subgroup"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDeleteGroup(group.id)}
              className="p-1 hover:bg-destructive/20 rounded"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      {/* Group Content */}
      {group.isExpanded && (
        <div className="px-4 pb-2 space-y-2">
          {/* Subgroup Input */}
          {showSubgroupInput && (
            <div className="flex gap-2 mb-2 mt-2">
              <Input
                value={newSubgroupName}
                onChange={(e) => setNewSubgroupName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newSubgroupName.trim()) {
                    await onCreateSubgroup(group.id, newSubgroupName);
                    setNewSubgroupName('');
                    setShowSubgroupInput(false);
                  }
                }}
                placeholder="Subgroup name..."
                className="h-7 text-xs placeholder:text-xs !bg-neutral-800 !text-neutral-200"
                autoFocus
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (newSubgroupName.trim()) {
                    await onCreateSubgroup(group.id, newSubgroupName);
                    setNewSubgroupName('');
                    setShowSubgroupInput(false);
                  }
                }}
                className="h-7 px-2 !bg-neutral-800 !text-neutral-200"
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowSubgroupInput(false);
                  setNewSubgroupName('');
                }}
                className="h-7 px-2 !bg-neutral-800 !text-neutral-200"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Nested Groups */}
          {group.children && group.children.length > 0 && (
            <div className="space-y-2">
              {group.children.map((childGroup) => (
                <DroppableGroup
                  key={childGroup.id}
                  group={childGroup}
                  onToggleExpansion={onToggleExpansion}
                  onDeleteGroup={onDeleteGroup}
                  onToggleDocument={onToggleDocument}
                  onDocumentSelect={onDocumentSelect}
                  onDocumentDelete={onDocumentDelete}
                  onCreateSubgroup={onCreateSubgroup}
                  isOver={overId === `group-${childGroup.id}`}
                  overId={overId}
                  level={level + 1}
                  editingGroupId={editingGroupId}
                  setEditingGroupId={setEditingGroupId}
                  editingGroupName={editingGroupName}
                  setEditingGroupName={setEditingGroupName}
                  onGroupsChange={onGroupsChange}
                />
              ))}
            </div>
          )}

          {/* Documents */}
          <div className="space-y-1 min-h-[40px]">
            {group.documents.length === 0 && (!group.children || group.children.length === 0) ? (
              <div className="text-xs text-muted-foreground py-4 text-center pointer-events-none">
                Drop documents here
              </div>
            ) : (
              <SortableContext
                items={group.documents.map(d => d.doc.id)}
                strategy={verticalListSortingStrategy}
              >
                {group.documents.map(({ doc, membership }) => (
                  <SortableDocument
                    key={doc.id}
                    doc={doc}
                    membership={membership}
                    groupId={group.id}
                    onToggle={onToggleDocument}
                    onSelect={onDocumentSelect}
                    onDelete={onDocumentDelete}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const DocumentOrganizer: React.FC<DocumentOrganizerProps> = ({
  knowledgeBaseId,
  documents,
  onDocumentSelect,
  onDocumentDelete,
  onDocumentToggle,
  onGroupsChange
}) => {
  const [groups, setGroups] = useState<GroupWithDocuments[]>([]);
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

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

  useEffect(() => {
    loadGroupsAndDocuments();
  }, [knowledgeBaseId, documents]);

  const loadGroupsAndDocuments = async () => {
    try {
      // Ensure "Ungrouped" group exists
      const allGroups = await documentGroupsStorage.getGroupsByKB(knowledgeBaseId);
      let ungroupedGroup = allGroups.find(g => g.name === 'Ungrouped' && !g.parentGroupId);
      if (!ungroupedGroup) {
        console.log('Creating Ungrouped group');
        ungroupedGroup = await documentGroupsStorage.createGroup(knowledgeBaseId, 'Ungrouped', 'Documents not assigned to any group');
      }
      
      // Load hierarchical groups
      const hierarchicalGroups = await documentGroupsStorage.getGroupsHierarchically(knowledgeBaseId);
      
      // Load all memberships
      const allMemberships = await documentGroupsStorage.getAllMemberships();
      
      // Helper function to process groups recursively
      const processGroup = async (group: any): Promise<GroupWithDocuments> => {
        const groupMemberships = allMemberships.filter(m => m.groupId === group.id);
        const groupDocuments = documents
          .map(doc => {
            const membership = groupMemberships.find(m => m.documentId === doc.id);
            return membership ? { doc, membership } : null;
          })
          .filter(Boolean) as Array<{ doc: any; membership: DocumentGroupMembership }>;
        
        // Process children recursively
        const children = await Promise.all((group.children || []).map(processGroup));
        
        return {
          ...group,
          documents: groupDocuments.sort((a, b) => a.membership.order - b.membership.order),
          children,
          isExpanded: true
        };
      };
      
      // Process all root groups
      const groupsWithDocs = await Promise.all(hierarchicalGroups.map(processGroup));
      
      // Find ungrouped documents
      const groupedDocIds = allMemberships.map(m => m.documentId);
      const ungroupedDocs = documents.filter(doc => !groupedDocIds.includes(doc.id));
      
      console.log('Total documents:', documents.length);
      console.log('Grouped documents:', groupedDocIds.length);
      console.log('Ungrouped documents:', ungroupedDocs.length);
      
      // Add ungrouped documents to the "Ungrouped" group
      if (ungroupedGroup && ungroupedDocs.length > 0) {
        for (const doc of ungroupedDocs) {
          await documentGroupsStorage.addDocumentToGroup(doc.id, ungroupedGroup.id);
        }
        // Reload to show updated memberships
        return loadGroupsAndDocuments();
      }
      
      setGroups(groupsWithDocs);
    } catch (error) {
      console.error('Failed to load groups and documents:', error);
    }
  };

  const handleCreateGroup = async (parentGroupId?: string) => {
    if (!newGroupName.trim()) return;
    
    try {
      await documentGroupsStorage.createGroup(knowledgeBaseId, newGroupName, undefined, parentGroupId);
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
    
    try {
      await documentGroupsStorage.deleteGroup(groupId);
      await loadGroupsAndDocuments();
      onGroupsChange?.();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const handleToggleDocument = async (docId: string, isActive: boolean, groupId: string) => {
    try {
      // Check if document has a membership
      const allMemberships = await documentGroupsStorage.getAllMemberships();
      const hasMembership = allMemberships.some(m => m.documentId === docId);
      
      if (!hasMembership) {
        // If no membership exists (ungrouped doc), add it to the group first
        await documentGroupsStorage.addDocumentToGroup(docId, groupId);
      }
      
      // Now toggle the activation
      await documentGroupsStorage.toggleDocumentActivation(docId, isActive);
      
      if (onDocumentToggle) {
        onDocumentToggle(docId, isActive);
      }
      
      // Reload to reflect changes
      await loadGroupsAndDocuments();
    } catch (error) {
      console.error('Failed to toggle document:', error);
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g
    ));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    console.log('Drag started:', active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag ended. Active:', active.id, 'Over:', over?.id);
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    // Moving a document to a group
    if (activeData?.type === 'document' && overData?.type === 'group') {
      const docId = active.id as string;
      const targetGroupId = overData.group.id;
      const sourceGroupId = activeData.groupId;

      console.log('Moving document', docId, 'from group', sourceGroupId, 'to group', targetGroupId);

      if (sourceGroupId !== targetGroupId) {
        try {
          // Remove from current group
          await documentGroupsStorage.removeDocumentFromGroup(docId, sourceGroupId);
          // Add to new group
          await documentGroupsStorage.addDocumentToGroup(docId, targetGroupId);
          
          // Update orders in the source group
          const sourceGroup = groups.find(g => g.id === sourceGroupId);
          if (sourceGroup) {
            const remainingDocs = sourceGroup.documents.filter(d => d.doc.id !== docId);
            for (let i = 0; i < remainingDocs.length; i++) {
              await documentGroupsStorage.updateDocumentOrder(remainingDocs[i].doc.id, i);
            }
          }
          
          await loadGroupsAndDocuments();
          onGroupsChange?.();
        } catch (error) {
          console.error('Failed to move document:', error);
        }
      }
    }
    // Reordering within the same group
    else if (activeData?.type === 'document' && overData?.type === 'document') {
      if (activeData.groupId === overData.groupId) {
        console.log('Reordering within group', activeData.groupId);
        
        const groupId = activeData.groupId;
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const oldIndex = group.documents.findIndex(d => d.doc.id === active.id);
        const newIndex = group.documents.findIndex(d => d.doc.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          try {
            // Get all documents in the group
            const reorderedDocs = arrayMove(group.documents, oldIndex, newIndex);
            
            // Update the order in storage
            for (let i = 0; i < reorderedDocs.length; i++) {
              await documentGroupsStorage.updateDocumentOrder(reorderedDocs[i].doc.id, i);
            }
            
            // Reload to reflect changes
            await loadGroupsAndDocuments();
            onGroupsChange?.();
          } catch (error) {
            console.error('Failed to reorder documents:', error);
          }
        }
      } else {
        // Moving between groups by dropping on a document
        const docId = active.id as string;
        const targetGroupId = overData.groupId;
        const sourceGroupId = activeData.groupId;

        console.log('Moving document via document drop', docId, 'from group', sourceGroupId, 'to group', targetGroupId);

        if (sourceGroupId !== targetGroupId) {
          try {
            // Remove from current group
            await documentGroupsStorage.removeDocumentFromGroup(docId, sourceGroupId);
            // Add to new group
            await documentGroupsStorage.addDocumentToGroup(docId, targetGroupId);
            
            // Update orders in the source group
            const sourceGroup = groups.find(g => g.id === sourceGroupId);
            if (sourceGroup) {
              const remainingDocs = sourceGroup.documents.filter(d => d.doc.id !== docId);
              for (let i = 0; i < remainingDocs.length; i++) {
                await documentGroupsStorage.updateDocumentOrder(remainingDocs[i].doc.id, i);
              }
            }
            
            await loadGroupsAndDocuments();
            onGroupsChange?.();
          } catch (error) {
            console.error('Failed to move document:', error);
          }
        }
      }
    }

    setActiveId(null);
    setOverId(null);
  };

  // Get the active document for the drag overlay
  const getActiveDocument = () => {
    if (!activeId) return null;
    
    for (const group of groups) {
      const found = group.documents.find(d => d.doc.id === activeId);
      if (found) return found.doc;
    }
    return null;
  };

  const activeDocument = getActiveDocument();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Folders</h3>
            <button
              onClick={async () => {
                // Count all active documents across all groups
                let totalActive = 0;
                let totalDocs = 0;
                groups.forEach(group => {
                  totalDocs += group.documents.length;
                  totalActive += group.documents.filter(d => d.membership?.isActive).length;
                });
                
                const newState = totalActive < totalDocs; // Activate all if not all are active
                
                // Toggle all documents
                for (const group of groups) {
                  for (const { doc } of group.documents) {
                    await handleToggleDocument(doc.id, newState, group.id);
                  }
                }
              }}
              className="p-1 hover:bg-muted rounded"
              title="Toggle all documents"
            >
              {(() => {
                let totalActive = 0;
                let totalDocs = 0;
                groups.forEach(group => {
                  totalDocs += group.documents.length;
                  totalActive += group.documents.filter(d => d.membership?.isActive).length;
                });
                return totalActive === totalDocs ? 
                  <ToggleRight className="h-3 w-3 text-primary" /> : 
                  <ToggleLeft className="h-3 w-3 text-muted-foreground" />;
              })()}
            </button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNewGroupInput(true)}
            className="h-7 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Group
          </Button>
        </div>

        {/* New Group Input */}
        {showNewGroupInput && (
          <div className="flex gap-2 mb-4">
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              placeholder="Group name..."
              className="h-8 text-sm !bg-neutral-800 !text-neutral-200"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleCreateGroup()}
              className="h-8 px-3 !text-neutral-200 !bg-neutral-800"
            >
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNewGroupInput(false);
                setNewGroupName('');
              }}
              className="h-8 px-3"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Groups */}
        <div className="space-y-2 flex-1 overflow-y-auto">
          <SortableContext
            items={groups.map(g => `group-${g.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {groups.map((group) => (
              <DroppableGroup
                key={group.id}
                group={group}
                onToggleExpansion={toggleGroupExpansion}
                onDeleteGroup={handleDeleteGroup}
                onToggleDocument={handleToggleDocument}
                onDocumentSelect={onDocumentSelect}
                onDocumentDelete={onDocumentDelete}
                onCreateSubgroup={async (parentId, name) => {
                  if (!name.trim()) return;
                  setNewGroupName(name);
                  await handleCreateGroup(parentId);
                }}
                isOver={overId === `group-${group.id}`}
                overId={overId}
                level={0}
                editingGroupId={editingGroupId}
                setEditingGroupId={setEditingGroupId}
                editingGroupName={editingGroupName}
                setEditingGroupName={setEditingGroupName}
                onGroupsChange={onGroupsChange}
              />
            ))}
          </SortableContext>
        </div>
      </div>

      <DragOverlay>
        {activeDocument ? (
          <div className="flex items-center gap-2 p-1.5 bg-background border rounded shadow-lg">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{activeDocument.filename}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};