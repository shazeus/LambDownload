#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function commandSpec(command, args) {
  if (process.platform === 'win32' && ['npm', 'npx'].includes(command)) {
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', command, ...args],
    }
  }

  return { command, args }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const childCommand = commandSpec(command, args)
    const child = spawn(childCommand.command, childCommand.args, {
      cwd: projectRoot,
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

async function main() {
  await run('node', ['scripts/setup.mjs'])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
