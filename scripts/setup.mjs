#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { access, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir, platform } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const packagePath = path.join(projectRoot, 'package.json')
const configRoot = path.join(homedir(), '.lambdownload')
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

function commandSpec(command, commandArgs) {
  if (process.platform === 'win32' && ['npm', 'npx'].includes(command)) {
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', command, ...commandArgs],
    }
  }

  return { command, args: commandArgs }
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const childCommand = commandSpec(command, commandArgs)
    const child = spawn(childCommand.command, childCommand.args, {
      cwd: options.cwd ?? projectRoot,
      stdio: options.stdio ?? 'inherit',
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
    const childCommand = commandSpec(command, commandArgs)
    const child = spawn(childCommand.command, childCommand.args, {
      cwd: projectRoot,
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
  console.log('\nLambDownload Standalone Setup')
  console.log('Checking runtime dependencies...')
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

async function buildApp() {
  if (args.get('build') === 'false') {
    return
  }

  console.log('\nBuilding standalone app assets...')
  await run('npm', ['run', 'build'])
}

async function writeLaunchers() {
  const binDir = path.join(configRoot, 'bin')
  await mkdir(binDir, { recursive: true })

  const macLauncher = path.join(binDir, 'Start LambDownload.command')
  const windowsLauncher = path.join(binDir, 'Start LambDownload.bat')

  await writeFile(
    macLauncher,
    `#!/usr/bin/env sh\ncd "${projectRoot.replaceAll('"', '\\"')}"\nnpm run desktop\n`,
    { mode: 0o755 },
  )
  await writeFile(
    windowsLauncher,
    `@echo off\r\ncd /d "${projectRoot}"\r\nnpm run desktop\r\npause\r\n`,
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
  await ensureDependencies()
  await ensureConfig()
  await buildApp()
  const launchers = await writeLaunchers()

  console.log('\nSetup complete.')
  console.log(`Version: ${await packageVersion()}`)
  console.log(`Auto update: ${args.get('auto-update') === 'false' ? 'off' : 'on'}`)
  console.log(`Launcher: ${platform() === 'win32' ? launchers.windowsLauncher : launchers.macLauncher}`)
  console.log('Start LambDownload with npm run desktop or the generated launcher.')
}

main().catch((error) => {
  console.error(`\nSetup failed: ${error.message}`)
  process.exit(1)
})
