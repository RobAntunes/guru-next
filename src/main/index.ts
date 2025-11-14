import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIPCHandlers, cleanupIPCHandlers } from './ipc-handlers'
import { lanceDBManager } from './storage/lancedb-manager'
import { fileStorage } from './file-storage'
import { aiModelService } from './ai-model-service'
import { vectorStoreService } from './vector-store-service'
import { wasmVM } from './wasm-vm'

// electron-vite automatically provides __dirname via import.meta.dirname
const __dirname = import.meta.dirname

async function createWindow() {
  // Initialize services
  try {
    await lanceDBManager.connect()
    console.log('LanceDB initialized successfully')

    await fileStorage.initialize()
    console.log('File storage initialized successfully')

    // Skip AI services for now (ONNX Runtime has corrupted models)
    // Memory system uses simple hash-based embeddings instead
    console.log('AI services disabled - using fallback embeddings')
    console.log('Memory system will use simple hash-based embeddings')
  } catch (error) {
    console.error('Failed to initialize core services:', error)
  }
  
  // Register IPC handlers
  registerIPCHandlers()
  
  const preloadPath = join(__dirname, '../preload/index.mjs')
  console.log('Preload path:', preloadPath)
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  // Load the app
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', async () => {
  // Cleanup services
  cleanupIPCHandlers()
  await wasmVM.cleanup()
  await aiModelService.cleanup()
  await vectorStoreService.cleanup()
})

// Export MCP server for standalone use
export { mcpServer } from './mcp-server'
