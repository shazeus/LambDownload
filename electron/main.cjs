const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')

const isDev = !app.isPackaged
const appRoot = isDev ? path.resolve(__dirname, '..') : path.join(process.resourcesPath, 'app')
const logoPath = path.join(appRoot, 'public', 'logo.png')
let serviceProcess = null
let serviceLogStream = null
let servicePort = 4317

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

function findAvailablePort(preferredPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(findAvailablePort(0))
        return
      }
      reject(error)
    })
    server.listen(preferredPort, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : preferredPort
      server.close(() => resolve(port))
    })
  })
}

async function startService() {
  if (serviceProcess) {
    return
  }

  servicePort = await findAvailablePort(4317)

  const tsxCli = path.join(appRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const serverEntry = path.join(appRoot, 'server', 'index.ts')
  const logPath = path.join(app.getPath('userData'), 'service.log')
  serviceLogStream = fs.createWriteStream(logPath, { flags: 'a' })
  serviceLogStream.write(`\n[${new Date().toISOString()}] Starting LambDownload service\n`)
  serviceLogStream.write(`appRoot=${appRoot}\n`)
  serviceLogStream.write(`port=${servicePort}\n`)
  serviceLogStream.write(`tsx=${tsxCli} exists=${fileExists(tsxCli)}\n`)
  serviceLogStream.write(`server=${serverEntry} exists=${fileExists(serverEntry)}\n`)

  if (!fileExists(tsxCli) || !fileExists(serverEntry)) {
    console.error('Missing bundled service runtime. Run npm install before starting LambDownload.')
    serviceLogStream.write('Missing bundled service runtime.\n')
    return
  }

  serviceProcess = spawn(process.execPath, [tsxCli, serverEntry], {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      LAMBDOWNLOAD_PORT: String(servicePort),
      PYTHONIOENCODING: 'utf-8',
    },
    stdio: isDev ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  if (!isDev) {
    serviceProcess.stdout?.on('data', (chunk) => {
      serviceLogStream?.write(chunk)
    })
    serviceProcess.stderr?.on('data', (chunk) => {
      serviceLogStream?.write(chunk)
    })
  }

  serviceProcess.on('error', (error) => {
    serviceLogStream?.write(`[service error] ${error.message}\n`)
  })

  serviceProcess.on('exit', () => {
    serviceLogStream?.write(`[${new Date().toISOString()}] Service exited\n`)
    serviceProcess = null
  })
}

async function waitForService() {
  const serviceUrl = `http://127.0.0.1:${servicePort}`
  for (let attempt = 0; attempt < 120; attempt += 1) {
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
  await startService()
  await waitForService()

  const window = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 760,
    minHeight: 540,
    resizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    title: 'LambDownload',
    backgroundColor: '#080a0f',
    icon: fileExists(logoPath) ? logoPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      additionalArguments: [`--lambdownload-api-base=http://127.0.0.1:${servicePort}/api`],
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

ipcMain.on('lambdownload:start-drag', (event, filePath) => {
  if (!filePath || !fileExists(filePath)) return
  event.sender.startDrag({
    file: filePath,
    icon: fileExists(logoPath) ? logoPath : filePath,
  })
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

  if (serviceLogStream) {
    serviceLogStream.end()
    serviceLogStream = null
  }
})
