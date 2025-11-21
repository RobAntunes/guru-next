import React, { useEffect, useRef, useState } from 'react';
import { MergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { guruTheme } from '../../themes/editor-theme';
import { FileText, Split, Edit3, Save, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CorrectionDeckProps {
  originalCode: string;
  modifiedCode: string;
  onContentChange: (newCode: string) => void;
  fileName?: string;
  language?: string;
  className?: string;
  // Optional: if provided, component is controlled. If not, it manages its own view mode.
  viewMode?: 'diff' | 'edit';
  onViewModeChange?: (mode: 'diff' | 'edit') => void;
}

export const CorrectionDeck: React.FC<CorrectionDeckProps> = ({ 
  originalCode, 
  modifiedCode, 
  onContentChange,
  fileName = 'untitled',
  language = 'javascript',
  className,
  viewMode: controlledViewMode,
  onViewModeChange
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MergeView | EditorView | null>(null);
  
  // Internal state for view mode if uncontrolled
  const [internalViewMode, setInternalViewMode] = useState<'diff' | 'edit'>('diff');
  const activeViewMode = controlledViewMode ?? internalViewMode;

  const handleViewModeChange = (mode: 'diff' | 'edit') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setInternalViewMode(mode);
    }
  };

  const getLanguageExtension = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'typescript':
      case 'ts':
      case 'tsx':
      case 'jsx':
      case 'javascript':
      case 'js':
        return javascript({ typescript: true, jsx: true });
      case 'html':
        return html();
      case 'css':
        return css();
      case 'json':
        return json();
      case 'python':
      case 'py':
        return python();
      case 'markdown':
      case 'md':
        return markdown();
      default:
        return javascript();
    }
  };

  useEffect(() => {
    if (!parentRef.current) return;

    // Clean up previous instance
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const langExt = getLanguageExtension(language);
    
    // Common extensions for both modes
    const commonExtensions = [
      langExt,
      guruTheme,
      EditorView.lineWrapping,
      keymap.of(defaultKeymap),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onContentChange(update.state.doc.toString());
        }
      })
    ];

    if (activeViewMode === 'diff') {
      // Initialize MergeView (Split Diff)
      viewRef.current = new MergeView({
        a: {
          doc: originalCode,
          extensions: [
            langExt, 
            guruTheme, 
            EditorState.readOnly.of(true),
            EditorView.lineWrapping
          ]
        },
        b: {
          doc: modifiedCode,
          extensions: commonExtensions
        },
        parent: parentRef.current,
        gutter: true,
        highlightChanges: true,
        orientation: 'a-b',
        revertControls: 'a-to-b',
      });
    } else {
      // Initialize Standard EditorView (Direct Edit)
      viewRef.current = new EditorView({
        doc: modifiedCode,
        extensions: commonExtensions,
        parent: parentRef.current
      });
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [originalCode, modifiedCode, language, activeViewMode]); 

  return (
    <div className={cn("flex flex-col h-full border border-guru-border bg-[#050505] rounded-md overflow-hidden", className)}>
      {/* Deck Toolbar / Tabs */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#151515] border-b border-guru-border">
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-[#252525] text-xs text-muted-foreground border border-[#333]">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-mono">{fileName}</span>
            </div>
        </div>

        <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
            <button
                onClick={() => handleViewModeChange('diff')}
                className={cn(
                    "px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all",
                    activeViewMode === 'diff' 
                        ? "bg-guru-accent/20 text-guru-accent shadow-sm" 
                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
            >
                <Split className="w-3.5 h-3.5" />
                <span>Diff</span>
            </button>
            <div className="w-[1px] h-3 bg-white/10 mx-1"></div>
            <button
                onClick={() => handleViewModeChange('edit')}
                className={cn(
                    "px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all",
                    activeViewMode === 'edit' 
                        ? "bg-guru-accent/20 text-guru-accent shadow-sm" 
                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
            >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
            </button>
        </div>
      </div>

      {/* Editor Container */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-hidden font-mono text-sm relative group"
      />
    </div>
  );
};
