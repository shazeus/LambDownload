const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const isDev = !app.isPackaged
const appRoot = isDev ? path.resolve(__dirname, '..') : path.join(process.resourcesPath, 'app')
const serviceUrl = 'http://127.0.0.1:4317'
const logoPath = path.join(appRoot, 'public', 'logo.png')
let serviceProcess = null

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

function startService() {
  const tsxCli = path.join(appRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const serverEntry = path.join(appRoot, 'server', 'index.ts')

  if (!fileExists(tsxCli) || !fileExists(serverEntry)) {
    console.error('Missing bundled service runtime. Run npm install before starting LambDownload.')
    return
  }

  serviceProcess = spawn(process.execPath, [tsxCli, serverEntry], {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      LAMBDOWNLOAD_PORT: '4317',
    },
    stdio: isDev ? 'inherit' : 'ignore',
    windowsHide: true,
  })

  serviceProcess.on('exit', () => {
    serviceProcess = null
  })
}

async function waitForService() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${serviceUrl}/api/health`)
      if (response.ok) return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  return false
}

async function createWindow() {
  startService()
  await waitForService()

  const window = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 980,
    minHeight: 720,
    title: 'LambDownload',
    backgroundColor: '#080a0f',
    icon: fileExists(logoPath) ? logoPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else if (isDev) {
    await window.loadURL('http://localhost:5173')
  } else {
    await window.loadFile(path.join(appRoot, 'dist', 'index.html'))
  }
}

ipcMain.handle('lambdownload:reveal-file', (_event, filePath) => {
  if (!filePath || !fileExists(filePath)) return false
  shell.showItemInFolder(filePath)
  return true
})

ipcMain.handle('lambdownload:open-external', async (_event, url) => {
  if (!url || typeof url !== 'string') return false
  await shell.openExternal(url)
  return true
})

ipcMain.handle('lambdownload:start-drag', (event, filePath) => {
  if (!filePath || !fileExists(filePath)) return false
  event.sender.startDrag({
    file: filePath,
    icon: fileExists(logoPath) ? logoPath : filePath,
  })
  return true
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow()
  }
})

app.on('before-quit', () => {
  if (serviceProcess) {
    serviceProcess.kill()
    serviceProcess = null
  }
})
