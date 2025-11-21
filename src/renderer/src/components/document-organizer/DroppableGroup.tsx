import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, FolderOpen, Plus, Trash2, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDocument } from './SortableDocument';
import { DocumentGroupMembership } from '../../services/document-groups-storage';

interface GroupWithDocuments {
  id: string;
  name: string;
  documents: Array<{
    doc: any;
    membership: DocumentGroupMembership | null;
  }>;
  children: GroupWithDocuments[];
  isExpanded?: boolean;
}

export function DroppableGroup({ 
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
}: any) {
  const {
    setNodeRef,
  } = useSortable({
    id: `group-${group.id}`,
    data: {
      type: 'group',
      group: group
    }
  });

  const [showSubgroupInput, setShowSubgroupInput] = React.useState(false);
  const [newSubgroupName, setNewSubgroupName] = React.useState('');

  // Calculate active documents including children recursively for display
  const getActiveCount = (g: GroupWithDocuments): { active: number, total: number } => {
    let active = g.documents.filter(d => d.membership?.isActive).length;
    let total = g.documents.length;
    
    if (g.children) {
      g.children.forEach(child => {
        const childCounts = getActiveCount(child);
        active += childCounts.active;
        total += childCounts.total;
      });
    }
    return { active, total };
  };
  
  const counts = getActiveCount(group);

  const handleToggleAllInGroup = async () => {
    const newState = counts.active < counts.total;
    const toggleRecursive = async (g: GroupWithDocuments) => {
      for (const { doc } of g.documents) {
        await onToggleDocument(doc.id, newState, g.id);
      }
      if (g.children) {
        for (const child of g.children) {
          await toggleRecursive(child);
        }
      }
    };
    await toggleRecursive(group);
  };

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg transition-all ${
        isOver ? 'border-primary bg-primary/5 shadow-md' : 'border-muted'
      }`}
      style={{ marginLeft: `${level * 12}px` }}
    >
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
              if (e.key === 'Enter') {
                  // Handle save
                  setEditingGroupId(null);
                  onGroupsChange?.();
              }
            }}
            className="h-6 text-sm flex-1"
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium flex-1 truncate">{group.name}</span>
        )}
        
        <span className="text-xs text-muted-foreground">
          {counts.active}/{counts.total}
        </span>

        <button
          onClick={handleToggleAllInGroup}
          className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {counts.active === counts.total ? 
            <ToggleRight className="h-3 w-3 text-primary" /> : 
            <ToggleLeft className="h-3 w-3 text-muted-foreground" />
          }
        </button>

        {group.name !== 'Ungrouped' && (
            <button
              onClick={() => onDeleteGroup(group.id)}
              className="p-1 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
        )}
      </div>

      {group.isExpanded && (
        <div className="px-2 pb-2 space-y-1">
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
        </div>
      )}
    </div>
  );
}
