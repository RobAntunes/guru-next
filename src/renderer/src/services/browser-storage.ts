/**
 * Storage adapter for Electron
 * Now uses proper file system storage instead of localStorage
 */

export const BaseDirectory = {
  AppData: 'appData'
};

const api = (window as any).api?.storage;

// Check if we need to migrate from localStorage
let migrated = false;

async function ensureMigration() {
  if (migrated) return;
  
  try {
    const oldData = localStorage.getItem('guru_storage');
    if (oldData && api) {
      console.log('Migrating from localStorage to file storage...');
      const parsed = JSON.parse(oldData);
      await api.migrate({ guru_storage: oldData });
      localStorage.removeItem('guru_storage');
      console.log('Migration complete!');
    }
  } catch (e) {
    console.error('Migration failed:', e);
  }
  
  migrated = true;
}

function getCollectionAndId(path: string, baseDir?: string): { collection: string; id: string } {
  // Parse the path to extract collection and id
  // Example: "knowledge_bases/knowledge_bases.json" → collection: "knowledge-bases", id: "knowledge_bases"
  const pathParts = path.split('/');

  let collection = 'misc';
  let id = path.replace(/\//g, '_').replace(/\.json$/i, '');

  if (pathParts.length >= 2) {
    // First part is the collection, last part is the filename
    const collectionName = pathParts[0];
    const filename = pathParts[pathParts.length - 1];

    // Map to proper collection names
    if (collectionName === 'knowledge_bases') {
      collection = 'knowledge-bases';
    } else if (collectionName === 'documents') {
      collection = 'documents';
    } else if (collectionName === 'projects') {
      collection = 'projects';
    } else if (collectionName === 'specs') {
      collection = 'specs';
    } else if (collectionName === 'prompts') {
      collection = 'prompts';
    } else {
      collection = collectionName;
    }

    // Use the filename without extension as the ID
    id = filename.replace(/\.json$/i, '');
  } else if (pathParts.length === 1) {
    // Single file, use baseDir as collection if provided
    if (baseDir === 'appData') {
      collection = 'misc';
    } else {
      collection = baseDir || 'misc';
    }
    id = pathParts[0].replace(/\.json$/i, '');
  }

  return { collection, id };
}

export async function readTextFile(path: string, options?: { baseDir?: string }): Promise<string> {
  await ensureMigration();
  
  if (!api) {
    throw new Error('Storage API not available');
  }
  
  const { collection, id } = getCollectionAndId(path, options?.baseDir);
  const result = await api.read(collection, id);
  
  if (!result.success || !result.data) {
    throw new Error(`File not found: ${path}`);
  }
  
  return result.data.data;
}

export async function writeTextFile(path: string, contents: string, options?: { baseDir?: string }): Promise<void> {
  await ensureMigration();
  
  if (!api) {
    throw new Error('Storage API not available');
  }
  
  const { collection, id } = getCollectionAndId(path, options?.baseDir);
  const result = await api.write(collection, id, contents);
  
  if (!result.success) {
    throw new Error(`Failed to write file: ${path}`);
  }
}

export async function exists(path: string, options?: { baseDir?: string }): Promise<boolean> {
  await ensureMigration();
  
  if (!api) {
    return false;
  }
  
  const { collection, id } = getCollectionAndId(path, options?.baseDir);
  const result = await api.exists(collection, id);
  
  return result.success && result.data;
}

export async function mkdir(path: string, options?: { baseDir?: string; recursive?: boolean }): Promise<void> {
  // Directories are created automatically by file storage
  return Promise.resolve();
}

// Invoke function for Electron IPC
export async function invoke(command: string, args?: any): Promise<any> {
  console.warn('Electron IPC invoke called:', command, args);
  return {};
}
