/**
 * Local knowledge base storage using browser localStorage
 */

import { BaseDirectory, readTextFile, writeTextFile, mkdir as createDir, exists } from './browser-storage';
import { KnowledgeBase } from './guru-integration';
import { documentGroupsStorage } from './document-groups-storage';

interface StoredKnowledgeBase extends KnowledgeBase {
  // Additional fields for local storage
  localId: string;
  isLocal: boolean;
  projectId: string; // Associate with a project
}

class KnowledgeBaseStorageService {
  private readonly STORAGE_DIR = 'knowledge_bases';
  private readonly KB_FILE = 'knowledge_bases.json';

  /**
   * Initialize storage directory
   */
  private async ensureStorageDir(): Promise<void> {
    const dirExists = await exists(this.STORAGE_DIR, { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await createDir(this.STORAGE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
    }
  }

  /**
   * Get all knowledge bases from storage
   */
  async getAllKnowledgeBases(): Promise<StoredKnowledgeBase[]> {
    try {
      await this.ensureStorageDir();
      const filePath = `${this.STORAGE_DIR}/${this.KB_FILE}`;
      const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
      
      if (!fileExists) {
        return [];
      }

      const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
      const kbs = JSON.parse(content);
      // Convert date strings back to Date objects
      return kbs.map((kb: any) => ({
        ...kb,
        createdAt: new Date(kb.createdAt),
        lastUpdated: new Date(kb.lastUpdated)
      }));
    } catch (error) {
      console.error('Failed to read knowledge bases:', error);
      return [];
    }
  }

  /**
   * Save all knowledge bases to storage
   */
  async saveAllKnowledgeBases(knowledgeBases: StoredKnowledgeBase[]): Promise<void> {
    try {
      await this.ensureStorageDir();
      const filePath = `${this.STORAGE_DIR}/${this.KB_FILE}`;
      await writeTextFile(filePath, JSON.stringify(knowledgeBases, null, 2), { 
        baseDir: BaseDirectory.AppData 
      });
    } catch (error) {
      console.error('Failed to save knowledge bases:', error);
      throw error;
    }
  }

  /**
   * Create a new knowledge base (legacy method - use createKnowledgeBaseWithProject)
   */
  async createKnowledgeBase(
    name: string, 
    description: string,
    cognitiveSystemsEnabled: string[] = ['harmonic', 'quantum']
  ): Promise<StoredKnowledgeBase> {
    // Get current project ID
    const { projectStorage } = await import('./project-storage');
    const currentProject = await projectStorage.getCurrentProject();
    
    if (!currentProject) {
      throw new Error('No project selected');
    }
    
    const allKBs = await this.getAllKnowledgeBases();
    
    // Generate a unique ID
    const id = `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newKB: StoredKnowledgeBase = {
      id,
      localId: id,
      name,
      description,
      createdAt: new Date(),
      lastUpdated: new Date(),
      documentCount: 0,
      chunkCount: 0,
      cognitiveSystemsEnabled,
      isLocal: true,
      projectId: currentProject.id
    };

    await this.saveAllKnowledgeBases([...allKBs, newKB]);
    
    // Create default "Ungrouped" group for this KB
    await documentGroupsStorage.createGroup(id, 'Ungrouped', 'Documents not assigned to any group');
    
    // Update project metadata
    await projectStorage.updateProjectMetadata(currentProject.id);
    
    return newKB;
  }

  /**
   * Update a knowledge base
   */
  async updateKnowledgeBase(id: string, updates: Partial<StoredKnowledgeBase>): Promise<void> {
    const allKBs = await this.getAllKnowledgeBases();
    const updatedKBs = allKBs.map(kb => 
      kb.id === id 
        ? { ...kb, ...updates, lastUpdated: new Date().toISOString() }
        : kb
    );
    await this.saveAllKnowledgeBases(updatedKBs);
  }

  /**
   * Delete a knowledge base
   */
  async deleteKnowledgeBase(id: string): Promise<void> {
    const allKBs = await this.getAllKnowledgeBases();
    const filtered = allKBs.filter(kb => kb.id !== id);
    await this.saveAllKnowledgeBases(filtered);
    
    // Also delete all groups for this KB
    await documentGroupsStorage.deleteGroupsByKB(id);
  }

  /**
   * Get a single knowledge base by ID
   */
  async getKnowledgeBase(id: string): Promise<StoredKnowledgeBase | null> {
    const allKBs = await this.getAllKnowledgeBases();
    return allKBs.find(kb => kb.id === id) || null;
  }

  /**
   * Get all knowledge bases for a specific project
   */
  async getKnowledgeBasesByProject(projectId: string): Promise<StoredKnowledgeBase[]> {
    const allKBs = await this.getAllKnowledgeBases();
    return allKBs.filter(kb => kb.projectId === projectId);
  }

  /**
   * Create a knowledge base with project association
   */
  async createKnowledgeBaseWithProject(name: string, description: string, projectId: string): Promise<StoredKnowledgeBase> {
    // Import projectStorage to get current project if not provided
    const { projectStorage } = await import('./project-storage');
    const actualProjectId = projectId || (await projectStorage.getCurrentProject())?.id;
    
    if (!actualProjectId) {
      throw new Error('No project selected');
    }

    const newKB: StoredKnowledgeBase = {
      id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      localId: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      documentCount: 0,
      chunkCount: 0,
      createdAt: new Date(),
      lastUpdated: new Date(),
      isLocal: true,
      projectId: actualProjectId
    };

    const allKBs = await this.getAllKnowledgeBases();
    allKBs.push(newKB);
    await this.saveAllKnowledgeBases(allKBs);

    // Update project metadata
    await projectStorage.updateProjectMetadata(actualProjectId);

    return newKB;
  }

  /**
   * Delete all knowledge bases for a project
   */
  async deleteKnowledgeBasesByProject(projectId: string): Promise<void> {
    const allKBs = await this.getAllKnowledgeBases();
    const kbsToDelete = allKBs.filter(kb => kb.projectId === projectId);
    
    // Delete all groups for each KB
    for (const kb of kbsToDelete) {
      await documentGroupsStorage.deleteGroupsByKB(kb.id);
    }
    
    const filtered = allKBs.filter(kb => kb.projectId !== projectId);
    await this.saveAllKnowledgeBases(filtered);
  }
}

export const knowledgeBaseStorage = new KnowledgeBaseStorageService();