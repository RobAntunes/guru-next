/**
 * File System Handlers
 * Native file dialogs and file operations
 */

import { readFile, stat, readdir } from 'fs/promises';
import { join, extname, basename } from 'path';

// Optional electron imports for dialog functions
let dialog: any = null;
let app: any = null;

try {
  const electron = require('electron');
  dialog = electron.dialog;
  app = electron.app;
} catch (e) {
  // Running in standalone mode without Electron
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  extension: string;
  lastModified: Date;
  isDirectory: boolean;
}

/**
 * Open file selection dialog
 */
export async function openFileDialog(options?: {
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string[] | null> {
  if (!dialog) {
    throw new Error('Dialog not available in standalone mode');
  }

  const result = await dialog.showOpenDialog({
    properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: options?.filters || [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg'] },
      { name: 'Code', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths;
}

/**
 * Open folder selection dialog
 */
export async function openFolderDialog(): Promise<string | null> {
  if (!dialog) {
    throw new Error('Dialog not available in standalone mode');
  }

  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Read file content
 */
export async function readFileContent(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return content;
}

/**
 * Read file as base64
 */
export async function readFileAsBase64(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return content.toString('base64');
}

/**
 * Get file info
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  const stats = await stat(filePath);
  
  return {
    path: filePath,
    name: basename(filePath),
    size: stats.size,
    extension: extname(filePath),
    lastModified: stats.mtime,
    isDirectory: stats.isDirectory()
  };
}

/**
 * Get files in directory
 */
export async function getDirectoryFiles(dirPath: string, recursive: boolean = false): Promise<FileInfo[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files: FileInfo[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (recursive) {
        const subFiles = await getDirectoryFiles(fullPath, true);
        files.push(...subFiles);
      }
      
      const stats = await stat(fullPath);
      files.push({
        path: fullPath,
        name: entry.name,
        size: 0,
        extension: '',
        lastModified: stats.mtime,
        isDirectory: true
      });
    } else {
      const stats = await stat(fullPath);
      files.push({
        path: fullPath,
        name: entry.name,
        size: stats.size,
        extension: extname(entry.name),
        lastModified: stats.mtime,
        isDirectory: false
      });
    }
  }

  return files;
}

/**
 * Process uploaded files for storage
 */
export async function processUploadedFiles(
  filePaths: string[]
): Promise<Array<{
  id: string;
  filename: string;
  content: string;
  category: string;
  isBase64: boolean;
  metadata: {
    size: number;
    extension: string;
    uploadedAt: string;
  };
}>> {
  const processed = [];

  for (const filePath of filePaths) {
    const fileInfo = await getFileInfo(filePath);
    const ext = fileInfo.extension.toLowerCase();
    
    // Determine if binary or text
    const binaryExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.exe'];
    const isBinary = binaryExtensions.includes(ext);
    
    // Read content
    const content = isBinary 
      ? await readFileAsBase64(filePath)
      : await readFileContent(filePath);
    
    // Categorize file
    let category = 'document';
    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c'].includes(ext)) {
      category = 'code';
    } else if (['.md', '.txt', '.doc', '.docx'].includes(ext)) {
      category = 'documentation';
    } else if (['.json', '.yaml', '.yml', '.xml', '.toml'].includes(ext)) {
      category = 'config';
    } else if (['.pdf'].includes(ext)) {
      category = 'pdf';
    }
    
    processed.push({
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename: fileInfo.name,
      content,
      category,
      isBase64: isBinary,
      metadata: {
        size: fileInfo.size,
        extension: ext,
        uploadedAt: new Date().toISOString()
      }
    });
  }

  return processed;
}
