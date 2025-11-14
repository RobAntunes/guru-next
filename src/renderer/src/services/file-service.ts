/**
 * File Service
 * Wrapper around Electron file operations exposed via IPC
 */

interface FileAPI {
  openDialog: (options?: any) => Promise<{ success: boolean; data?: string[] | null; error?: string }>;
  openFolderDialog: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  readContent: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  readBase64: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  getInfo: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  getDirectoryFiles: (dirPath: string, recursive?: boolean) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  processUploads: (filePaths: string[]) => Promise<{ success: boolean; data?: any[]; error?: string }>;
}

class FileService {
  private api: FileAPI;

  constructor() {
    this.api = (window as any).api?.file;
    if (!this.api) {
      console.warn('File API not available');
    }
  }

  /**
   * Open file selection dialog
   */
  async selectFiles(options?: {
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<string[] | null> {
    if (!this.api) {
      throw new Error('File API not available');
    }

    const result = await this.api.openDialog(options);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to open file dialog');
    }

    return result.data || null;
  }

  /**
   * Open folder selection dialog
   */
  async selectFolder(): Promise<string | null> {
    if (!this.api) {
      throw new Error('File API not available');
    }

    const result = await this.api.openFolderDialog();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to open folder dialog');
    }

    return result.data || null;
  }

  /**
   * Read file content as text
   */
  async readFileContent(filePath: string): Promise<string> {
    if (!this.api) {
      throw new Error('File API not available');
    }

    const result = await this.api.readContent(filePath);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to read file');
    }

    return result.data || '';
  }

  /**
   * Read file as base64
   */
  async readFileAsBase64(filePath: string): Promise<string> {
    if (!this.api) {
      throw new Error('File API not available');
    }

    const result = await this.api.readBase64(filePath);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to read file');
    }

    return result.data || '';
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath: string): Promise<{
    path: string;
    name: string;
    size: number;
    extension: string;
    lastModified: Date;
    isDirectory: boolean;
  }> {
    if (!this.api) {
      throw new Error('File API not available');
    }

    const result = await this.api.getInfo(filePath);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get file info');
    }

    return result.data;
  }

  /**
   * Get files in directory
   */
  async getDirectoryFiles(dirPath: string, recursive: boolean = false): Promise<any[]> {
    if (!this.api) {
      throw new Error('File API not available');
    }

    const result = await this.api.getDirectoryFiles(dirPath, recursive);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to read directory');
    }

    return result.data || [];
  }

  /**
   * Process uploaded files
   * Reads and categorizes files for storage
   */
  async processUploadedFiles(filePaths: string[]): Promise<Array<{
    id: string;
    filename: string;
    content: string;
    category: string;
    isBase64: boolean;
    metadata: any;
  }>> {
    if (!this.api) {
      throw new Error('File API not available');
    }

    const result = await this.api.processUploads(filePaths);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to process files');
    }

    return result.data || [];
  }

  /**
   * Upload documents to knowledge base
   */
  async uploadToKnowledgeBase(knowledgeBaseId: string): Promise<{
    documents: any[];
    count: number;
  }> {
    // Open file dialog
    const filePaths = await this.selectFiles({
      multiple: true,
      filters: [
        { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'doc', 'docx'] },
        { name: 'Code', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!filePaths || filePaths.length === 0) {
      return { documents: [], count: 0 };
    }

    // Process the files
    const documents = await this.processUploadedFiles(filePaths);

    return {
      documents,
      count: documents.length
    };
  }
}

export const fileService = new FileService();
