import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { Check, X, AlertCircle, ChevronDown, ChevronRight, FileDiff } from 'lucide-react';
import { parseDiffText, DiffFile, DiffHunk } from '../../utils/diff-parser';

interface DiffViewerProps {
  diffText?: string;
  oldContent?: string;
  newContent?: string;
  fileName?: string;
  oldTitle?: string;
  newTitle?: string;
  mode?: 'unified' | 'split';
}

export const DiffViewer = ({
  diffText,
  oldContent,
  newContent,
  fileName,
  oldTitle = 'Original',
  newTitle = 'Modified',
  mode = 'unified'
}: DiffViewerProps) => {
  const parsedDiff = useMemo(() => {
    if (diffText) {
      return parseDiffText(diffText);
    }
    return null;
  }, [diffText]);

  const simpleDiff = useMemo(() => {
    if (!oldContent || !newContent) return null;

    // Simple line-by-line diff
    const oldLines = oldContent.split('');
    const newLines = newContent.split('');
    const maxLines = Math.max(oldLines.length, newLines.length);

    const changes: Array<{ type: 'add' | 'remove' | 'unchanged'; line: string; lineNum: number }> = [];

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        changes.push({ type: 'unchanged', line: oldLine || '', lineNum: i + 1 });
      } else if (oldLine === undefined) {
        changes.push({ type: 'add', line: newLine, lineNum: i + 1 });
      } else if (newLine === undefined) {
        changes.push({ type: 'remove', line: oldLine, lineNum: i + 1 });
      } else {
        changes.push({ type: 'remove', line: oldLine, lineNum: i + 1 });
        changes.push({ type: 'add', line: newLine, lineNum: i + 1 });
      }
    }

    return changes;
  }, [oldContent, newContent]);

  if (parsedDiff && parsedDiff.files.length > 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        {parsedDiff.files.map((file, idx) => (
          <DiffFileView key={idx} file={file} mode={mode} />
        ))}
      </div>
    );
  }

  if (simpleDiff) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-b border-border">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileDiff className="w-3.5 h-3.5" />
              <span>{oldTitle}</span>
            </div>
            <span className="text-muted-foreground/50">→</span>
            <div className="flex items-center gap-2 text-foreground font-medium">
              <span>{newTitle}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-green-500">+{simpleDiff.filter(c => c.type === 'add').length}</span>
            <span className="text-xs font-mono text-red-500">-{simpleDiff.filter(c => c.type === 'remove').length}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-sm bg-[#0d1117] text-gray-300">
          {simpleDiff.map((change, idx) => (
            <DiffLine key={idx} change={change} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background text-muted-foreground">
      <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-sm">No diff to display</p>
    </div>
  );
};

interface DiffFileViewProps {
  file: DiffFile;
  mode: 'unified' | 'split';
}

const DiffFileView = ({ file, mode }: DiffFileViewProps) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className="flex flex-col border-b border-border last:border-b-0">
      <div
        className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-mono font-medium text-foreground">{file.path}</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-green-500">+{file.additions}</span>
          <span className="text-xs font-mono text-red-500">-{file.deletions}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="font-mono text-sm bg-[#0d1117] text-gray-300">
          {file.hunks.map((hunk, idx) => (
            <DiffHunkView key={idx} hunk={hunk} />
          ))}
        </div>
      )}
    </div>
  );
};

interface DiffHunkViewProps {
  hunk: DiffHunk;
}

const DiffHunkView = ({ hunk }: DiffHunkViewProps) => {
  return (
    <div className="border-b border-border/20 last:border-b-0">
      <div className="bg-[#1c2128] px-3 py-1 text-xs text-gray-500 select-none border-b border-border/10">
        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
      </div>
      {hunk.lines.map((line, idx) => {
        const firstChar = line[0];
        const content = line.slice(1);

        let bgColor = '';
        let textColor = 'text-gray-300';
        let prefix = ' ';
        let prefixColor = 'text-gray-600';

        if (firstChar === '+') {
          bgColor = 'bg-green-900/20';
          textColor = 'text-green-200';
          prefix = '+';
          prefixColor = 'text-green-500/50';
        } else if (firstChar === '-') {
          bgColor = 'bg-red-900/20';
          textColor = 'text-red-200';
          prefix = '-';
          prefixColor = 'text-red-500/50';
        }

        return (
          <div key={idx} className={cn('flex', bgColor, textColor)}>
            <span className={cn('w-8 text-center select-none', prefixColor)}>{prefix}</span>
            <span className="flex-1 pr-4">{content}</span>
          </div>
        );
      })}
    </div>
  );
};

interface DiffLineProps {
  change: { type: 'add' | 'remove' | 'unchanged'; line: string; lineNum: number };
}

const DiffLine = ({ change }: DiffLineProps) => {
  let bgColor = '';
  let textColor = 'text-gray-300';
  let prefix = ' ';
  let prefixColor = 'text-gray-600';

  if (change.type === 'add') {
    bgColor = 'bg-green-900/20';
    textColor = 'text-green-200';
    prefix = '+';
    prefixColor = 'text-green-500/50';
  } else if (change.type === 'remove') {
    bgColor = 'bg-red-900/20';
    textColor = 'text-red-200';
    prefix = '-';
    prefixColor = 'text-red-500/50';
  }

  return (
    <div className={cn('flex', bgColor, textColor)}>
      <span className={cn('w-8 text-center select-none', prefixColor)}>{prefix}</span>
      <span className="flex-1 pr-4 whitespace-pre">{change.line}</span>
    </div>
  );
};
