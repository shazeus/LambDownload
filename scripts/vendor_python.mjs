#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { chmodSync, existsSync } from 'node:fs'
import { readdir, rm, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const vendorRoot = path.join(projectRoot, 'vendor', 'python')
const runtimeRoot = path.join(projectRoot, 'vendor', 'python-runtime')
const runtimeCacheRoot = path.join(os.tmpdir(), 'lambdownload-python-runtime')
const pythonBuildStandaloneApi = 'https://api.github.com/repos/astral-sh/python-build-standalone/releases/latest'
const pythonMajorMinor = '3.13'

function platformTriple() {
  if (process.platform === 'darwin' && process.arch === 'arm64') return 'aarch64-apple-darwin'
  if (process.platform === 'darwin' && process.arch === 'x64') return 'x86_64-apple-darwin'
  if (process.platform === 'win32' && process.arch === 'x64') return 'x86_64-pc-windows-msvc'
  if (process.platform === 'linux' && process.arch === 'x64') return 'x86_64-unknown-linux-gnu'
  if (process.platform === 'linux' && process.arch === 'arm64') return 'aarch64-unknown-linux-gnu'

  throw new Error(`Unsupported bundled Python platform: ${process.platform}/${process.arch}`)
}

function capture(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: false,
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

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', ...(options.env ?? {}) },
      shell: false,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
  })
}

async function fetchJson(url) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'LambDownload',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(url, {
    headers,
  })

  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: ${response.status}`)
  }

  return response.json()
}

async function downloadFile(url, filePath) {
  const headers = { 'User-Agent': 'LambDownload' }
  if (process.env.GITHUB_TOKEN && url.includes('api.github.com')) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(url, {
    headers,
  })

  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status}`)
  }

  const data = Buffer.from(await response.arrayBuffer())
  await writeFile(filePath, data)
}

async function findRuntimePython() {
  const executableName = process.platform === 'win32' ? 'python.exe' : 'python3'
  const matches = []

  async function walk(directory, depth = 0) {
    if (depth > 6 || !existsSync(directory)) return
    const entries = await readdir(directory, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(entryPath, depth + 1)
      } else if (
        entry.isFile() &&
        (entry.name === executableName ||
          (process.platform !== 'win32' && /^python3\.\d+$/.test(entry.name)))
      ) {
        matches.push(entryPath)
      }
    }
  }

  await walk(runtimeRoot)

  return (
    matches.find((match) => match.includes(`${path.sep}install${path.sep}`)) ??
    matches.find((match) => match.includes(`${path.sep}bin${path.sep}python3.`)) ??
    matches[0] ??
    ''
  )
}

async function ensureRuntimePython() {
  const existingPython = await findRuntimePython()
  if (existingPython) {
    const version = await capture(existingPython, ['--version'])
    if (version.startsWith(`Python ${pythonMajorMinor}.`)) {
      console.log(`Using bundled ${version}`)
      return existingPython
    }
  }

  const triple = platformTriple()
  const release = await fetchJson(pythonBuildStandaloneApi)
  const asset = release.assets?.find((candidate) => {
    const name = candidate.name ?? ''
    return (
      name.startsWith(`cpython-${pythonMajorMinor}.`) &&
      name.includes(`-${triple}-`) &&
      name.endsWith('-install_only_stripped.tar.gz') &&
      !name.includes('freethreaded')
    )
  })

  if (!asset?.browser_download_url) {
    throw new Error(`Could not find bundled Python asset for ${triple}`)
  }

  await mkdir(runtimeCacheRoot, { recursive: true })
  const archivePath = path.join(runtimeCacheRoot, asset.name)
  console.log(`Downloading bundled Python runtime: ${asset.name}`)
  await downloadFile(asset.browser_download_url, archivePath)
  await rm(runtimeRoot, { recursive: true, force: true })
  await mkdir(runtimeRoot, { recursive: true })
  await run('tar', ['-xzf', archivePath, '-C', runtimeRoot])

  const runtimePython = await findRuntimePython()
  if (!runtimePython) {
    throw new Error('Bundled Python archive did not contain a Python executable.')
  }

  if (process.platform !== 'win32') {
    chmodSync(runtimePython, 0o755)
  }

  const version = await capture(runtimePython, ['--version'])
  console.log(`Prepared bundled ${version}`)
  return runtimePython
}

async function removeBytecode(root) {
  const entries = await readdir(root, { withFileTypes: true })

  await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__') {
        await rm(entryPath, { recursive: true, force: true })
        return
      }

      await removeBytecode(entryPath)
      return
    }

    if (entry.isFile() && entry.name.endsWith('.pyc')) {
      await rm(entryPath, { force: true })
    }
  }))
}

async function main() {
  const runtimePython = await ensureRuntimePython()
  const python = {
    command: runtimePython,
    args: [],
    version: await capture(runtimePython, ['--version']),
  }
  console.log(`Vendoring Python dependencies with bundled ${python.version}`)
  await rm(vendorRoot, { recursive: true, force: true })
  await mkdir(vendorRoot, { recursive: true })
  await run(python.command, [...python.args, '-m', 'ensurepip', '--upgrade'])
  await run(python.command, [
    ...python.args,
    '-m',
    'pip',
    'install',
    '--upgrade',
    '--no-compile',
    '--target',
    vendorRoot,
    '-r',
    'requirements.txt',
  ])
  await removeBytecode(vendorRoot)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
