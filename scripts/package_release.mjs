#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const releaseRoot = path.join(projectRoot, 'release')
const archivePath = path.join(releaseRoot, 'lambdownload-release.zip')

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
await run('zip', [
  '-r',
  archivePath,
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
  '-x',
  'node_modules/*',
  '.git/*',
])
console.log(`Created ${archivePath}`)
