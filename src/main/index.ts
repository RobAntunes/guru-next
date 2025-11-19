import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIPCHandlers, cleanupIPCHandlers } from './ipc-handlers'
import { lanceDBManager } from './storage/lancedb-manager'
import { fileStorage } from './file-storage'
import { aiModelService } from './ai-model-service'
import { vectorStoreService } from './vector-store-service'
import { wasmVM } from './wasm-vm'

import { natsService } from './services/nats-service'
import { happenManager } from './services/happen/happen-manager'

// electron-vite automatically provides __dirname via import.meta.dirname
const __dirname = import.meta.dirname

async function createWindow() {
  // Initialize services
  try {
    await natsService.start()
    console.log('NATS Server initialized')

    // Initialize Happen Nodes (after NATS is up)
    await happenManager.initialize()

    await lanceDBManager.connect()
    console.log('LanceDB initialized successfully')

    await fileStorage.initialize()
    console.log('File storage initialized successfully')
  } catch (error) {
    console.error('Failed to initialize core services:', error)
  }

  // Initialize AI Service (with graceful fallback)
  try {
    await aiModelService.initialize()
  } catch (error) {
    console.error('AI Service initialization error:', error.message)
    // Continue anyway - it will use fallback mode
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
  natsService.stop()
  await wasmVM.cleanup()
  await aiModelService.cleanup()
  await vectorStoreService.cleanup()
})

// Export MCP server for standalone use
export { mcpServer } from './mcp-server'
