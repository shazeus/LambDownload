const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('lambdownload', {
  isDesktop: true,
  startDrag: (filePath) => ipcRenderer.invoke('lambdownload:start-drag', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('lambdownload:reveal-file', filePath),
  openExternal: (url) => ipcRenderer.invoke('lambdownload:open-external', url),
})
