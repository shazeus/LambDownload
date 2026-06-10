#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const configRoot = path.join(homedir(), '.lambdownload')

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

async function main() {
  await mkdir(configRoot, { recursive: true })
  await writeFile(
    path.join(configRoot, 'config.json'),
    `${JSON.stringify({ autoUpdate: true, releaseRepo: 'shazeus/LambDownload' }, null, 2)}\n`,
  )
  await run('npm', ['install'])
  await run('python3', ['-m', 'pip', 'install', '-r', 'requirements.txt'])
  await run('npm', ['run', 'build'])
  console.log('LambDownload installed. Run npm run dev:all to start the local panel and service.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
