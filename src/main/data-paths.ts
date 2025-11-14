/**
 * Data path utilities that work in both Electron and standalone Node.js
 */

import { join } from 'path';
import { homedir } from 'os';

/**
 * Get the user data directory
 * Works in both Electron and standalone Node.js
 */
export function getUserDataDir(): string {
  // Check if running in Electron
  try {
    // Dynamic import to avoid error in standalone mode
    const electron = require('electron');
    if (electron && electron.app) {
      return electron.app.getPath('userData');
    }
  } catch (e) {
    // Not in Electron, use fallback
  }

  // Standalone mode: use standard application data directory
  const platform = process.platform;
  const home = homedir();

  switch (platform) {
    case 'darwin': // macOS
      return join(home, 'Library', 'Application Support', 'guru-electron');
    case 'win32': // Windows
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'guru-electron');
    case 'linux':
      return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'guru-electron');
    default:
      return join(home, '.guru-electron');
  }
}

/**
 * Get the data storage directory
 */
export function getDataDir(): string {
  return join(getUserDataDir(), 'guru-data');
}

/**
 * Get the LanceDB directory
 */
export function getLanceDBDir(): string {
  return join(getUserDataDir(), 'lancedb');
}
