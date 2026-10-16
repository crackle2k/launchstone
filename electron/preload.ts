import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopApi } from '../shared/contracts'

const api: DesktopApi = {
  info: () => ipcRenderer.invoke('app:info'),
  selectJava: () => ipcRenderer.invoke('app:java'),
  listWorlds: () => ipcRenderer.invoke('world:list'),
  createWorld: (input) => ipcRenderer.invoke('world:create', input),
  importServer: (id) => ipcRenderer.invoke('world:import', id),
  startServer: (id) => ipcRenderer.invoke('world:start', id),
  stopServer: (id) => ipcRenderer.invoke('world:stop', id),
  serverLogs: (id) => ipcRenderer.invoke('world:logs', id),
  companionStatus: (id) => ipcRenderer.invoke('world:companion', id),
  createCheckpoint: (id) => ipcRenderer.invoke('world:checkpoint', id),
  listCheckpoints: (id) => ipcRenderer.invoke('world:checkpoints', id),
  openWorldFolder: (id) => ipcRenderer.invoke('world:folder', id),
}
contextBridge.exposeInMainWorld('launchstone', api)
