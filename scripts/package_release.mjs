#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const releaseRoot = path.join(projectRoot, 'release')
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
const version = packageJson.version

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
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

await rm(releaseRoot, { recursive: true, force: true })
await mkdir(releaseRoot, { recursive: true })

const commonFiles = [
  'adobe',
  'dist',
  'installers',
  'scripts',
  'server',
  'src',
  '.github',
  'package.json',
  'package-lock.json',
  'requirements.txt',
  'README.md',
  'LICENSE',
]

async function createArchive(name) {
  const archivePath = path.join(releaseRoot, name)
  await run('zip', ['-r', archivePath, ...commonFiles, '-x', 'node_modules/*', '.git/*', 'release/*'])
  console.log(`Created ${archivePath}`)
}

await createArchive('lambdownload-release.zip')
await createArchive(`lambdownload-v${version}-macos-linux.zip`)
await createArchive(`lambdownload-v${version}-windows.zip`)
