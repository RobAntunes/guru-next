import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FileText, Eye, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function SortableDocument({ 
  doc, 
  membership, 
  groupId,
  onToggle,
  onSelect,
  onDelete 
}: any) {
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
        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors group"
      >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move p-1 hover:bg-muted rounded touch-none opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-sm flex-1 truncate" title={doc.filename}>{doc.filename}</span>
      <div onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={membership?.isActive ?? true}
          onCheckedChange={(checked) => onToggle(doc.id, checked, groupId)}
          className="scale-75 origin-right"
        />
      </div>
      <button
        onClick={() => onSelect(doc)}
        className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Eye className="h-3 w-3" />
      </button>
      <button
        onClick={() => onDelete(doc.id)}
        className="p-1 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      </div>
    </>
  );
}
