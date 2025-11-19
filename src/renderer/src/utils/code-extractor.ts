/**
 * Code Extractor
 * Extracts code blocks and structured data from AI responses
 */

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface BashCommand {
  command: string;
  description?: string;
  raw: string;
}

/**
 * Extract code blocks from markdown text
 */
export function extractCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w+)(?:\s+(.+?))?\n([\s\S]*?)```/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      language: match[1],
      filename: match[2],
      code: match[3].trim()
    });
  }

  return blocks;
}

/**
 * Extract bash commands from text
 */
export function extractBashCommands(text: string): BashCommand[] {
  const commands: BashCommand[] = [];

  // Look for bash code blocks
  const bashBlocks = extractCodeBlocks(text).filter(
    block => block.language === 'bash' || block.language === 'sh'
  );

  for (const block of bashBlocks) {
    const lines = block.code.split('\n');
    let currentCommand = '';
    let description: string | undefined;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        if (currentCommand) {
          commands.push({
            command: currentCommand.trim(),
            description,
            raw: currentCommand
          });
          currentCommand = '';
          description = undefined;
        }
        continue;
      }

      // Check for comment (description)
      if (trimmedLine.startsWith('#')) {
        description = trimmedLine.substring(1).trim();
        continue;
      }

      // Multi-line command (ends with \)
      if (trimmedLine.endsWith('\\')) {
        currentCommand += trimmedLine.slice(0, -1) + ' ';
      } else {
        currentCommand += trimmedLine;
        commands.push({
          command: currentCommand.trim(),
          description,
          raw: currentCommand
        });
        currentCommand = '';
        description = undefined;
      }
    }

    // Add last command if exists
    if (currentCommand) {
      commands.push({
        command: currentCommand.trim(),
        description,
        raw: currentCommand
      });
    }
  }

  return commands;
}

/**
 * Extract file operations from text
 */
export function extractFileOperations(text: string): {
  creates: string[];
  modifies: string[];
  deletes: string[];
} {
  const creates: string[] = [];
  const modifies: string[] = [];
  const deletes: string[] = [];

  // Look for common patterns
  const createPatterns = [
    /create(?:s?|d|ing)?\s+(?:a\s+)?(?:new\s+)?file\s+(?:called\s+|named\s+)?[`'"]?([^`'":\n]+)[`'"]?/gi,
    /touch\s+([^\s\n]+)/gi,
    /write\s+(?:to\s+)?[`'"]?([^`'":\n]+)[`'"]?/gi
  ];

  const modifyPatterns = [
    /(?:update|modify|edit|change)\s+(?:the\s+)?file\s+[`'"]?([^`'":\n]+)[`'"]?/gi,
    /in\s+[`'"]?([^`'":\n]+)[`'"]?\s+(?:add|update|change)/gi
  ];

  const deletePatterns = [
    /(?:delete|remove)\s+(?:the\s+)?file\s+[`'"]?([^`'":\n]+)[`'"]?/gi,
    /rm\s+([^\s\n]+)/gi
  ];

  for (const pattern of createPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      creates.push(match[1]);
    }
  }

  for (const pattern of modifyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      modifies.push(match[1]);
    }
  }

  for (const pattern of deletePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      deletes.push(match[1]);
    }
  }

  return { creates, modifies, deletes };
}

/**
 * Extract structured data from code blocks
 */
export function extractStructuredData<T = any>(text: string, language: string): T[] {
  const blocks = extractCodeBlocks(text).filter(block => block.language === language);
  const results: T[] = [];

  for (const block of blocks) {
    try {
      if (language === 'json') {
        results.push(JSON.parse(block.code));
      }
    } catch (error) {
      console.error('Failed to parse structured data:', error);
    }
  }

  return results;
}

/**
 * Clean code block (remove common artifacts)
 */
export function cleanCodeBlock(code: string): string {
  return code
    .replace(/^[\s\n]+/, '') // Remove leading whitespace
    .replace(/[\s\n]+$/, '') // Remove trailing whitespace
    .replace(/\r\n/g, '\n'); // Normalize line endings
}
