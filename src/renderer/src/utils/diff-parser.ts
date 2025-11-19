/**
 * Diff Parser
 * Parses git-style diffs from AI responses
 */

import { parsePatch, applyPatch } from 'diff';

export interface ParsedDiff {
  files: DiffFile[];
}

export interface DiffFile {
  path: string;
  oldContent: string;
  newContent: string;
  diff: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

/**
 * Parse diff text from AI response
 */
export function parseDiffText(diffText: string): ParsedDiff {
  const files: DiffFile[] = [];

  // Extract diff blocks (looking for ```diff or git diff format)
  const diffBlockRegex = /```diff\n([\s\S]*?)\n```/g;
  const gitDiffRegex = /diff --git a\/(.*?) b\/\1\n([\s\S]*?)(?=\ndiff --git|$)/g;

  let match;

  // Try code block format first
  while ((match = diffBlockRegex.exec(diffText)) !== null) {
    const diffContent = match[1];
    files.push(...parseSingleDiff(diffContent));
  }

  // If no code blocks found, try git diff format
  if (files.length === 0) {
    while ((match = gitDiffRegex.exec(diffText)) !== null) {
      const filePath = match[1];
      const diffContent = match[0];
      files.push(...parseSingleDiff(diffContent, filePath));
    }
  }

  return { files };
}

/**
 * Parse a single diff block
 */
function parseSingleDiff(diffContent: string, filePath?: string): DiffFile[] {
  const files: DiffFile[] = [];

  try {
    const patches = parsePatch(diffContent);

    for (const patch of patches) {
      const path = filePath || patch.newFileName || patch.oldFileName || 'unknown';

      let additions = 0;
      let deletions = 0;
      const hunks: DiffHunk[] = [];

      for (const hunk of patch.hunks) {
        const lines: string[] = [];

        for (const line of hunk.lines) {
          lines.push(line);
          if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++;
          }
        }

        hunks.push({
          oldStart: hunk.oldStart,
          oldLines: hunk.oldLines,
          newStart: hunk.newStart,
          newLines: hunk.newLines,
          lines
        });
      }

      files.push({
        path,
        oldContent: '',
        newContent: '',
        diff: diffContent,
        additions,
        deletions,
        hunks
      });
    }
  } catch (error) {
    console.error('Failed to parse diff:', error);
  }

  return files;
}

/**
 * Apply diff to content
 */
export function applyDiffToContent(originalContent: string, diff: string): string | null {
  try {
    const result = applyPatch(originalContent, diff);
    return result === false ? null : result;
  } catch (error) {
    console.error('Failed to apply diff:', error);
    return null;
  }
}

/**
 * Extract file path from diff header
 */
export function extractFilePathFromDiff(diffText: string): string | null {
  const match = diffText.match(/^diff --git a\/(.*?) b\/\1/m) ||
                diffText.match(/^--- a\/(.*?)$/m) ||
                diffText.match(/^\+\+\+ b\/(.*?)$/m);

  return match ? match[1] : null;
}

/**
 * Format diff for display
 */
export function formatDiffForDisplay(file: DiffFile): string {
  const header = `diff --git a/${file.path} b/${file.path}\n`;
  const stats = `+${file.additions} -${file.deletions}\n`;
  const hunksText = file.hunks.map(hunk => {
    const hunkHeader = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n`;
    return hunkHeader + hunk.lines.join('\n');
  }).join('\n');

  return header + stats + hunksText;
}
