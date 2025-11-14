/**
 * Document groups storage for organizing documents into flows
 */

import { BaseDirectory, readTextFile, writeTextFile, mkdir as createDir, exists } from './browser-storage';

export interface DocumentGroup {
  id: string;
  knowledgeBaseId: string;
  parentGroupId?: string; // For nested groups
  name: string;
  description?: string;
  order: number; // Order of the group within the KB
  createdAt: string;
  updatedAt: string;
}

export interface DocumentGroupMembership {
  documentId: string;
  groupId: string;
  order: number; // Order within the group
  isActive: boolean; // Whether the document is active in context
}

class DocumentGroupsStorageService {
  private readonly STORAGE_DIR = 'knowledge_bases';
  private readonly GROUPS_FILE = 'document_groups.json';
  private readonly MEMBERSHIPS_FILE = 'group_memberships.json';

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
   * Get all document groups
   */
  async getAllGroups(): Promise<DocumentGroup[]> {
    try {
      await this.ensureStorageDir();
      const filePath = `${this.STORAGE_DIR}/${this.GROUPS_FILE}`;
      const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
      
      if (!fileExists) {
        return [];
      }

      const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read document groups:', error);
      return [];
    }
  }

  /**
   * Save all document groups
   */
  async saveAllGroups(groups: DocumentGroup[]): Promise<void> {
    try {
      await this.ensureStorageDir();
      const filePath = `${this.STORAGE_DIR}/${this.GROUPS_FILE}`;
      await writeTextFile(filePath, JSON.stringify(groups, null, 2), { 
        baseDir: BaseDirectory.AppData 
      });
    } catch (error) {
      console.error('Failed to save document groups:', error);
      throw error;
    }
  }

  /**
   * Get all group memberships
   */
  async getAllMemberships(): Promise<DocumentGroupMembership[]> {
    try {
      await this.ensureStorageDir();
      const filePath = `${this.STORAGE_DIR}/${this.MEMBERSHIPS_FILE}`;
      const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
      
      if (!fileExists) {
        return [];
      }

      const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read group memberships:', error);
      return [];
    }
  }

  /**
   * Save all group memberships
   */
  async saveAllMemberships(memberships: DocumentGroupMembership[]): Promise<void> {
    try {
      await this.ensureStorageDir();
      const filePath = `${this.STORAGE_DIR}/${this.MEMBERSHIPS_FILE}`;
      await writeTextFile(filePath, JSON.stringify(memberships, null, 2), { 
        baseDir: BaseDirectory.AppData 
      });
    } catch (error) {
      console.error('Failed to save group memberships:', error);
      throw error;
    }
  }

  /**
   * Create a new group
   */
  async createGroup(
    knowledgeBaseId: string,
    name: string,
    description?: string,
    parentGroupId?: string
  ): Promise<DocumentGroup> {
    const groups = await this.getAllGroups();
    const kbGroups = groups.filter(g => g.knowledgeBaseId === knowledgeBaseId && g.parentGroupId === parentGroupId);
    
    const newGroup: DocumentGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      knowledgeBaseId,
      parentGroupId,
      name,
      description,
      order: kbGroups.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveAllGroups([...groups, newGroup]);
    return newGroup;
  }

  /**
   * Update a group
   */
  async updateGroup(groupId: string, updates: Partial<DocumentGroup>): Promise<void> {
    const groups = await this.getAllGroups();
    const updatedGroups = groups.map(g => 
      g.id === groupId 
        ? { ...g, ...updates, updatedAt: new Date().toISOString() }
        : g
    );
    await this.saveAllGroups(updatedGroups);
  }

  /**
   * Delete a group and its memberships
   */
  async deleteGroup(groupId: string): Promise<void> {
    // Delete the group
    const groups = await this.getAllGroups();
    const filteredGroups = groups.filter(g => g.id !== groupId);
    await this.saveAllGroups(filteredGroups);

    // Delete all memberships for this group
    const memberships = await this.getAllMemberships();
    const filteredMemberships = memberships.filter(m => m.groupId !== groupId);
    await this.saveAllMemberships(filteredMemberships);
  }

  /**
   * Get groups for a knowledge base
   */
  async getGroupsByKB(knowledgeBaseId: string): Promise<DocumentGroup[]> {
    const groups = await this.getAllGroups();
    return groups
      .filter(g => g.knowledgeBaseId === knowledgeBaseId)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get groups hierarchically (with nested structure)
   */
  async getGroupsHierarchically(knowledgeBaseId: string): Promise<(DocumentGroup & { children: DocumentGroup[] })[]> {
    const allGroups = await this.getGroupsByKB(knowledgeBaseId);
    const groupMap = new Map<string, DocumentGroup & { children: DocumentGroup[] }>();
    
    // Initialize all groups with empty children arrays
    allGroups.forEach(group => {
      groupMap.set(group.id, { ...group, children: [] });
    });
    
    // Build hierarchy
    const rootGroups: (DocumentGroup & { children: DocumentGroup[] })[] = [];
    
    allGroups.forEach(group => {
      const groupWithChildren = groupMap.get(group.id)!;
      
      if (group.parentGroupId && groupMap.has(group.parentGroupId)) {
        // Add to parent's children
        groupMap.get(group.parentGroupId)!.children.push(groupWithChildren);
      } else {
        // Root level group
        rootGroups.push(groupWithChildren);
      }
    });
    
    return rootGroups;
  }

  /**
   * Add document to group
   */
  async addDocumentToGroup(documentId: string, groupId: string): Promise<void> {
    const memberships = await this.getAllMemberships();
    
    // Remove from any existing group first
    const filtered = memberships.filter(m => m.documentId !== documentId);
    
    // Get max order in the target group
    const groupMemberships = filtered.filter(m => m.groupId === groupId);
    const maxOrder = groupMemberships.reduce((max, m) => Math.max(max, m.order), -1);
    
    const newMembership: DocumentGroupMembership = {
      documentId,
      groupId,
      order: maxOrder + 1,
      isActive: true // Default to active
    };
    
    await this.saveAllMemberships([...filtered, newMembership]);
  }

  /**
   * Remove document from group
   */
  async removeDocumentFromGroup(documentId: string, groupId?: string): Promise<void> {
    const memberships = await this.getAllMemberships();
    const filtered = groupId 
      ? memberships.filter(m => !(m.documentId === documentId && m.groupId === groupId))
      : memberships.filter(m => m.documentId !== documentId);
    await this.saveAllMemberships(filtered);
  }

  /**
   * Update document order within group
   */
  async updateDocumentOrder(documentId: string, newOrder: number): Promise<void> {
    const memberships = await this.getAllMemberships();
    const updated = memberships.map(m => 
      m.documentId === documentId 
        ? { ...m, order: newOrder }
        : m
    );
    await this.saveAllMemberships(updated);
  }

  /**
   * Toggle document activation
   */
  async toggleDocumentActivation(documentId: string, isActive: boolean): Promise<void> {
    const memberships = await this.getAllMemberships();
    const updated = memberships.map(m => 
      m.documentId === documentId 
        ? { ...m, isActive }
        : m
    );
    await this.saveAllMemberships(updated);
  }

  /**
   * Get document membership info
   */
  async getDocumentMembership(documentId: string): Promise<DocumentGroupMembership | null> {
    const memberships = await this.getAllMemberships();
    return memberships.find(m => m.documentId === documentId) || null;
  }

  /**
   * Get documents in a group
   */
  async getDocumentsByGroup(groupId: string): Promise<DocumentGroupMembership[]> {
    const memberships = await this.getAllMemberships();
    return memberships
      .filter(m => m.groupId === groupId)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Reorder groups within a knowledge base
   */
  async reorderGroups(knowledgeBaseId: string, groupIds: string[]): Promise<void> {
    const groups = await this.getAllGroups();
    const updated = groups.map(g => {
      if (g.knowledgeBaseId === knowledgeBaseId) {
        const newOrder = groupIds.indexOf(g.id);
        if (newOrder !== -1) {
          return { ...g, order: newOrder, updatedAt: new Date().toISOString() };
        }
      }
      return g;
    });
    await this.saveAllGroups(updated);
  }

  /**
   * Delete all groups for a knowledge base
   */
  async deleteGroupsByKB(knowledgeBaseId: string): Promise<void> {
    const groups = await this.getAllGroups();
    const kbGroups = groups.filter(g => g.knowledgeBaseId === knowledgeBaseId);
    const groupIds = kbGroups.map(g => g.id);
    
    // Delete groups
    const filteredGroups = groups.filter(g => g.knowledgeBaseId !== knowledgeBaseId);
    await this.saveAllGroups(filteredGroups);
    
    // Delete memberships
    const memberships = await this.getAllMemberships();
    const filteredMemberships = memberships.filter(m => !groupIds.includes(m.groupId));
    await this.saveAllMemberships(filteredMemberships);
  }
}

export const documentGroupsStorage = new DocumentGroupsStorageService();