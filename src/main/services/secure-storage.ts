/**
 * Secure Storage Service
 * Uses Electron's safeStorage API to encrypt sensitive data like API keys
 */

import { safeStorage } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';

class SecureStorageService {
  private readonly storageDir: string;

  constructor() {
    this.storageDir = join(app.getPath('userData'), 'secure');
  }

  /**
   * Store encrypted data
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }

    const encrypted = safeStorage.encryptString(value);
    const filePath = join(this.storageDir, `${key}.enc`);

    // Ensure directory exists
    const fs = await import('fs/promises');
    await fs.mkdir(this.storageDir, { recursive: true });

    await writeFile(filePath, encrypted);
  }

  /**
   * Retrieve and decrypt data
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const filePath = join(this.storageDir, `${key}.enc`);
      const encrypted = await readFile(filePath);
      const decrypted = safeStorage.decryptString(encrypted);
      return decrypted;
    } catch (error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  /**
   * Remove encrypted data
   */
  async removeItem(key: string): Promise<void> {
    try {
      const filePath = join(this.storageDir, `${key}.enc`);
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error) {
      // File doesn't exist - that's fine
    }
  }

  /**
   * Check if encryption is available
   */
  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }
}

export const secureStorage = new SecureStorageService();
