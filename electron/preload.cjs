const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('lambdownload', {
  isDesktop: true,
  apiBase: process.argv.find((arg) => arg.startsWith('--lambdownload-api-base='))?.split('=')[1],
  startDrag: (filePath) => ipcRenderer.send('lambdownload:start-drag', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('lambdownload:reveal-file', filePath),
  openExternal: (url) => ipcRenderer.invoke('lambdownload:open-external', url),
})
