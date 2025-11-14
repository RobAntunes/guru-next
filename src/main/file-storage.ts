/**
 * File-based Storage Service
 * Replaces localStorage with proper file system storage
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getDataDir } from './data-paths.js';

const DATA_DIR = getDataDir();

export interface StorageItem {
  id: string;
  data: any;
  metadata?: {
    createdAt: string;
    updatedAt: string;
    [key: string]: any;
  };
}

class FileStorage {
  private initialized = false;

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create data directories
    await this.ensureDir(DATA_DIR);
    await this.ensureDir(path.join(DATA_DIR, 'knowledge-bases'));
    await this.ensureDir(path.join(DATA_DIR, 'documents'));
    await this.ensureDir(path.join(DATA_DIR, 'projects'));
    await this.ensureDir(path.join(DATA_DIR, 'specs'));
    await this.ensureDir(path.join(DATA_DIR, 'prompts'));

    this.initialized = true;
    console.log('File storage initialized at:', DATA_DIR);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Read a file
   */
  async readFile(collection: string, id: string): Promise<StorageItem | null> {
    await this.initialize();

    const filePath = path.join(DATA_DIR, collection, `${id}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write a file
   */
  async writeFile(collection: string, id: string, data: any): Promise<void> {
    await this.initialize();

    const filePath = path.join(DATA_DIR, collection, `${id}.json`);
    const now = new Date().toISOString();

    // Read existing metadata if file exists
    let metadata = {
      createdAt: now,
      updatedAt: now,
    };

    try {
      const existing = await this.readFile(collection, id);
      if (existing?.metadata?.createdAt) {
        metadata.createdAt = existing.metadata.createdAt;
      }
    } catch (error) {
      // File doesn't exist, use new metadata
    }

    const item: StorageItem = {
      id,
      data,
      metadata,
    };

    await fs.writeFile(filePath, JSON.stringify(item, null, 2), 'utf-8');
  }

  /**
   * Delete a file
   */
  async deleteFile(collection: string, id: string): Promise<void> {
    await this.initialize();

    const filePath = path.join(DATA_DIR, collection, `${id}.json`);

    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List all files in a collection
   */
  async listFiles(collection: string): Promise<StorageItem[]> {
    await this.initialize();

    const dirPath = path.join(DATA_DIR, collection);

    try {
      const files = await fs.readdir(dirPath);
      const items: StorageItem[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.replace('.json', '');
          const item = await this.readFile(collection, id);
          if (item) {
            items.push(item);
          }
        }
      }

      return items;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async exists(collection: string, id: string): Promise<boolean> {
    await this.initialize();

    const filePath = path.join(DATA_DIR, collection, `${id}.json`);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage stats
   */
  async getStats(): Promise<{
    dataDir: string;
    collections: Record<string, number>;
  }> {
    await this.initialize();

    const collections = ['knowledge-bases', 'documents', 'projects', 'specs', 'prompts'];
    const stats: Record<string, number> = {};

    for (const collection of collections) {
      const items = await this.listFiles(collection);
      stats[collection] = items.length;
    }

    return {
      dataDir: DATA_DIR,
      collections: stats,
    };
  }

  /**
   * Migrate data from localStorage
   */
  async migrateFromLocalStorage(localStorageData: Record<string, string>): Promise<void> {
    await this.initialize();

    console.log('Starting localStorage migration...');

    try {
      // Parse the guru_storage key
      const guruStorage = localStorageData['guru_storage'];
      if (!guruStorage) {
        console.log('No guru_storage found in localStorage');
        return;
      }

      const data = JSON.parse(guruStorage);

      // Migrate each key
      for (const [key, value] of Object.entries(data)) {
        try {
          // Parse the key format: "baseDir:path"
          // Example: "appData:knowledge_bases/documents.json"
          const parts = key.split(':');
          if (parts.length >= 2) {
            const storagePath = parts.slice(1).join(':');

            // Extract collection and filename from path
            // e.g., "knowledge_bases/documents.json" → collection: "knowledge-bases", id: "documents"
            const pathParts = storagePath.split('/');
            let collection = 'misc';
            let id = storagePath.replace(/\//g, '_').replace(/\.json$/i, '');

            // Map common patterns to collections
            if (storagePath.includes('knowledge_bases')) {
              collection = 'knowledge-bases';
              id = storagePath.split('/').pop()?.replace(/\.json$/i, '') || id;
            } else if (storagePath.includes('documents')) {
              collection = 'documents';
              id = storagePath.split('/').pop()?.replace(/\.json$/i, '') || id;
            } else if (storagePath.includes('projects')) {
              collection = 'projects';
              id = storagePath.split('/').pop()?.replace(/\.json$/i, '') || id;
            } else if (storagePath.includes('specs')) {
              collection = 'specs';
              id = storagePath.split('/').pop()?.replace(/\.json$/i, '') || id;
            } else if (storagePath.includes('prompts')) {
              collection = 'prompts';
              id = storagePath.split('/').pop()?.replace(/\.json$/i, '') || id;
            }

            // Ensure collection directory exists
            const collectionPath = path.join(DATA_DIR, collection);
            await this.ensureDir(collectionPath);

            await this.writeFile(collection, id, value);
            console.log(`Migrated: ${key} → ${collection}/${id}`);
          }
        } catch (error) {
          console.error(`Failed to migrate ${key}:`, error);
        }
      }

      console.log('localStorage migration complete');
    } catch (error) {
      console.error('Failed to migrate from localStorage:', error);
      throw error;
    }
  }
}

// Singleton instance
export const fileStorage = new FileStorage();
