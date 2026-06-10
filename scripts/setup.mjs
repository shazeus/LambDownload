#!/usr/bin/env node
import { spawn } from 'node:child_process'
import {
  access,
  cp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { constants } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { homedir, platform } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const packagePath = path.join(projectRoot, 'package.json')
const configRoot = path.join(homedir(), '.lambdownload')
const extensionId = 'com.shazeus.lambdownload.panel'
let pythonRuntime = null

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, value = 'true'] = arg.slice(2).split('=')
      return [key, value]
    }),
)

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd ?? projectRoot,
      stdio: options.stdio ?? 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${code}`))
    })
  })
}

async function capture(command, commandArgs) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    let text = ''
    child.stdout.on('data', (chunk) => {
      text += chunk.toString()
    })
    child.on('error', () => resolve(''))
    child.on('close', (code) => resolve(code === 0 ? text.trim() : ''))
  })
}

function pythonCandidates() {
  if (process.env.LAMBDOWNLOAD_PYTHON) {
    return [{ command: process.env.LAMBDOWNLOAD_PYTHON, args: [] }]
  }

  if (process.platform === 'win32') {
    return [
      { command: 'py', args: ['-3'] },
      { command: 'python', args: [] },
      { command: 'python3', args: [] },
    ]
  }

  return [
    { command: 'python3', args: [] },
    { command: 'python', args: [] },
  ]
}

async function findPython() {
  for (const candidate of pythonCandidates()) {
    const version = await capture(candidate.command, [...candidate.args, '--version'])
    if (version) {
      return { ...candidate, version }
    }
  }

  return null
}

async function runPython(commandArgs) {
  if (!pythonRuntime) {
    pythonRuntime = await findPython()
  }
  if (!pythonRuntime) {
    throw new Error('Python 3 is required. Install Python 3 first.')
  }

  await run(pythonRuntime.command, [...pythonRuntime.args, ...commandArgs])
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function packageVersion() {
  const payload = JSON.parse(await readFile(packagePath, 'utf8'))
  return payload.version
}

async function chooseTarget() {
  const argTarget = args.get('target')
  if (argTarget) {
    return argTarget
  }

  const rl = createInterface({ input, output })
  console.log('\nLambDownload Setup')
  console.log('1) After Effects')
  console.log('2) Premiere Pro')
  console.log('3) Both')
  console.log('4) Dependencies only')
  const answer = await rl.question('Install target [3]: ')
  rl.close()

  if (answer.trim() === '1') return 'after'
  if (answer.trim() === '2') return 'premiere'
  if (answer.trim() === '4') return 'deps'
  return 'both'
}

function cepExtensionsRoot() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA
    if (!appData) {
      throw new Error('APPDATA is not set; cannot locate Adobe CEP extensions folder.')
    }
    return path.join(appData, 'Adobe', 'CEP', 'extensions')
  }

  return path.join(homedir(), 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions')
}

function uxpExternalRoot() {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA
    if (!appData) {
      throw new Error('APPDATA is not set; cannot locate Adobe UXP folder.')
    }
    return path.join(appData, 'Adobe', 'UXP', 'Plugins', 'External')
  }

  return path.join(homedir(), 'Library', 'Application Support', 'Adobe', 'UXP', 'Plugins', 'External')
}

async function ensureConfig() {
  const autoUpdate = args.get('auto-update') !== 'false'
  if (!pythonRuntime) {
    pythonRuntime = await findPython()
  }
  await mkdir(configRoot, { recursive: true })
  await writeFile(
    path.join(configRoot, 'config.json'),
    `${JSON.stringify(
      {
        autoUpdate,
        releaseRepo: 'shazeus/LambDownload',
        pythonCommand: pythonRuntime?.command ?? null,
        pythonArgs: pythonRuntime?.args ?? [],
      },
      null,
      2,
    )}\n`,
  )
}

async function ensureDependencies() {
  console.log('\nChecking runtime dependencies...')
  const nodeVersion = await capture('node', ['--version'])
  const npmVersion = await capture('npm', ['--version'])
  pythonRuntime = await findPython()

  if (!nodeVersion) {
    throw new Error('Node.js is required. Install Node.js 20+ first.')
  }
  if (!npmVersion) {
    throw new Error('npm is required. Install Node.js/npm first.')
  }
  if (!pythonRuntime) {
    throw new Error('Python 3 is required. Install Python 3 first.')
  }

  console.log(`Node: ${nodeVersion}`)
  console.log(`npm: ${npmVersion}`)
  console.log(`Python: ${pythonRuntime.version}`)

  console.log('\nInstalling or updating JavaScript packages...')
  await run('npm', ['install'])

  console.log('\nInstalling or updating Python downloader packages...')
  await runPython(['-m', 'pip', 'install', '--upgrade', '-r', 'requirements.txt'])
}

async function buildPanel() {
  if (args.get('build') === 'false') {
    return
  }

  console.log('\nBuilding panel assets...')
  await run('npm', ['run', 'build'])
}

async function installCepBundle(target) {
  if (target === 'deps') {
    return null
  }

  const destination = path.join(cepExtensionsRoot(), extensionId)
  console.log(`\nInstalling CEP panel to ${destination}`)

  await rm(destination, { recursive: true, force: true })
  await mkdir(destination, { recursive: true })
  await cp(path.join(projectRoot, 'adobe', 'cep', 'CSXS'), path.join(destination, 'CSXS'), {
    recursive: true,
  })
  await cp(path.join(projectRoot, 'adobe', 'cep', 'client'), path.join(destination, 'client'), {
    recursive: true,
  })
  await cp(path.join(projectRoot, 'adobe', 'cep', 'host'), path.join(destination, 'host'), {
    recursive: true,
  })
  await cp(path.join(projectRoot, 'dist'), path.join(destination, 'dist'), {
    recursive: true,
  })

  const targetFile = path.join(destination, 'install-target.txt')
  await writeFile(
    targetFile,
    `Installed for: ${target}\nVersion: ${await packageVersion()}\nUse Adobe Window > Extensions > LambDownload.\n`,
  )
  return destination
}

async function installUxpReference(target) {
  if (target !== 'premiere' && target !== 'both') {
    return null
  }

  const destination = path.join(uxpExternalRoot(), 'com.shazeus.lambdownload')
  console.log(`Installing Premiere UXP reference package to ${destination}`)
  await rm(destination, { recursive: true, force: true })
  await mkdir(destination, { recursive: true })
  await cp(path.join(projectRoot, 'adobe', 'uxp'), destination, { recursive: true })
  await cp(path.join(projectRoot, 'dist'), path.join(destination, 'dist'), { recursive: true })
  return destination
}

async function writeLaunchers() {
  const binDir = path.join(configRoot, 'bin')
  await mkdir(binDir, { recursive: true })

  const macLauncher = path.join(binDir, 'Start LambDownload.command')
  const windowsLauncher = path.join(binDir, 'Start LambDownload.bat')

  await writeFile(
    macLauncher,
    `#!/usr/bin/env sh\ncd "${projectRoot.replaceAll('"', '\\"')}"\nnpm run dev:all\n`,
    { mode: 0o755 },
  )
  await writeFile(
    windowsLauncher,
    `@echo off\r\ncd /d "${projectRoot}"\r\nnpm run dev:all\r\npause\r\n`,
  )

  if (platform() !== 'win32') {
    const desktop = path.join(homedir(), 'Desktop')
    if (await exists(desktop)) {
      const desktopLink = path.join(desktop, 'Start LambDownload.command')
      await rm(desktopLink, { force: true })
      await symlink(macLauncher, desktopLink)
    }
  }

  return { macLauncher, windowsLauncher }
}

async function main() {
  const target = await chooseTarget()
  if (!['after', 'premiere', 'both', 'deps'].includes(target)) {
    throw new Error('Invalid target. Use after, premiere, both, or deps.')
  }

  await ensureDependencies()
  await ensureConfig()
  await buildPanel()

  const cepPath = await installCepBundle(target)
  const uxpPath = await installUxpReference(target)
  const launchers = await writeLaunchers()

  console.log('\nSetup complete.')
  console.log(`Target: ${target}`)
  if (cepPath) console.log(`CEP panel: ${cepPath}`)
  if (uxpPath) console.log(`UXP reference: ${uxpPath}`)
  console.log(`Launcher: ${platform() === 'win32' ? launchers.windowsLauncher : launchers.macLauncher}`)
  console.log('Start the local service before opening the Adobe panel.')
}

main().catch((error) => {
  console.error(`\nSetup failed: ${error.message}`)
  process.exit(1)
})
