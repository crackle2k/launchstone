import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { mkdir } from 'node:fs/promises'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WorldId, CreateWorld } from '../shared/contracts'
import { WorldStore } from './world-store'
import { ServerManager } from './server-manager'

const here = fileURLToPath(new URL('.', import.meta.url))
if (process.env.LAUNCHSTONE_DATA_DIR) {
  const profile = join(process.env.LAUNCHSTONE_DATA_DIR, '.electron')
  mkdirSync(profile, { recursive: true })
  app.setPath('userData', profile)
}
let window: BrowserWindow | null = null
let manager: ServerManager
const hasLock = app.requestSingleInstanceLock()
if (!hasLock) app.quit()
else {
  app.on('second-instance', () => {
    window?.show()
    window?.focus()
  })
  app
    .whenReady()
    .then(async () => {
      const store = new WorldStore(
        process.env.LAUNCHSTONE_DATA_DIR ||
          join(app.getPath('userData'), 'data'),
      )
      await mkdir(store.root, { recursive: true })
      manager = new ServerManager(store)
      await manager.initialize()
      function handle(channel: string, handler: (...args: any[]) => unknown) {
        ipcMain.handle(channel, (event, ...args) => {
          if (
            !window ||
            event.sender !== window.webContents ||
            event.senderFrame !== window.webContents.mainFrame
          )
            throw new Error('Untrusted IPC sender')
          return handler(...args)
        })
      }
      handle('app:info', async () => ({
        dataDirectory: store.root,
        appVersion: app.getVersion(),
        javaVersion: await manager.javaVersion(),
      }))
      handle('app:java', async () => {
        const result = await dialog.showOpenDialog(window!, {
          title: 'Select your Java 17 executable',
          properties: ['openFile', 'showHiddenFiles'],
        })
        if (result.canceled || !result.filePaths[0]) return false
        await manager.setJava(result.filePaths[0])
        return true
      })
      handle('world:list', () => manager.list())
      handle('world:create', async (input) => {
        const world = await store.create(CreateWorld.parse(input))
        return manager.view(world.id)
      })
      handle('world:import', async (value) => {
        const id = WorldId.parse(value)
        const result = await dialog.showOpenDialog(window!, {
          title: 'Import an installed Forge dedicated server folder',
          properties: ['openDirectory'],
        })
        if (result.canceled || !result.filePaths[0]) return false
        await manager.importServer(id, result.filePaths[0])
        return true
      })
      handle('world:start', (id) => manager.start(WorldId.parse(id)))
      handle('world:stop', (id) => manager.stop(WorldId.parse(id)))
      handle('world:logs', (id) => manager.serverLogs(WorldId.parse(id)))
      handle('world:companion', (id) => manager.companion(WorldId.parse(id)))
      handle('world:checkpoint', (id) => manager.checkpoint(WorldId.parse(id)))
      handle('world:checkpoints', (id) => store.checkpoints(WorldId.parse(id)))
      handle('world:folder', async (id) => {
        await store.get(WorldId.parse(id))
        const error = await shell.openPath(store.serverPath(id))
        if (error) throw new Error(error)
      })
      createWindow()
      app.on('activate', () => {
        if (!window) createWindow()
      })
    })
    .catch((error) => {
      dialog.showErrorBox('Launchstone could not start', String(error))
      app.quit()
    })
}
function createWindow() {
  window = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#101411',
    title: 'Launchstone',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(here, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.on('close', (event) => {
    if (manager.hasActiveServers()) {
      event.preventDefault()
      dialog.showMessageBoxSync(window!, {
        type: 'info',
        title: 'A world is still running',
        message:
          'Stop your server before closing Launchstone so Minecraft can save the world.',
        buttons: ['Keep Launchstone open'],
      })
    }
  })
  window.on('closed', () => {
    window = null
  })
  if (process.env.ELECTRON_RENDERER_URL)
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(here, '../renderer/index.html'))
}
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
