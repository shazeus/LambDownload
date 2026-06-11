const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('lambdownload', {
  isDesktop: true,
  startDrag: (filePath) => ipcRenderer.send('lambdownload:start-drag', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('lambdownload:reveal-file', filePath),
  openExternal: (url) => ipcRenderer.invoke('lambdownload:open-external', url),
})
