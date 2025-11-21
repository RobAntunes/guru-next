import { EditorView } from '@codemirror/view';

export const guruTheme = EditorView.theme({
  "&": {
    backgroundColor: "#050505",
    color: "#e5e5e5",
    height: "100%",
  },
  ".cm-gutters": {
    backgroundColor: "#0A0A0A",
    borderRight: "1px solid #262626",
    color: "#666",
  },
  ".cm-scroller": {
    fontFamily: "'JetBrains Mono', monospace",
  },
  // The "Green" Additions
  ".cm-merge-b-chunk": {
    backgroundColor: "rgba(0, 255, 65, 0.1) !important"
  },
  ".cm-merge-b-text": {
    color: "#00FF41 !important"
  },
  // The "Red" Deletions
  ".cm-merge-a-chunk": {
    backgroundColor: "rgba(255, 0, 0, 0.1) !important",
    textDecoration: "line-through"
  },
  // Selection matches
  ".cm-selectionMatch": {
    backgroundColor: "#333"
  },
  // Cursor
  ".cm-cursor": {
    borderLeftColor: "#00FF41"
  },
  // Selection
  ".cm-content ::selection": {
    backgroundColor: "rgba(0, 255, 65, 0.2)"
  }
}, { dark: true });
