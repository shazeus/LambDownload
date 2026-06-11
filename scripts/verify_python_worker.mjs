#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const runtimeRoot = path.join(projectRoot, 'vendor', 'python-runtime')
const workerPath = path.join(projectRoot, 'scripts', 'python_downloader.py')

function bundledPython() {
  const candidates =
    process.platform === 'win32'
      ? [
          path.join(runtimeRoot, 'python', 'install', 'python.exe'),
          path.join(runtimeRoot, 'install', 'python.exe'),
          path.join(runtimeRoot, 'python', 'python.exe'),
          path.join(runtimeRoot, 'python.exe'),
        ]
      : [
          path.join(runtimeRoot, 'python', 'install', 'bin', 'python3'),
          path.join(runtimeRoot, 'python', 'install', 'bin', 'python3.13'),
          path.join(runtimeRoot, 'install', 'bin', 'python3'),
          path.join(runtimeRoot, 'install', 'bin', 'python3.13'),
          path.join(runtimeRoot, 'python', 'bin', 'python3'),
          path.join(runtimeRoot, 'python', 'bin', 'python3.13'),
        ]

  return candidates.find((candidate) => existsSync(candidate)) ?? ''
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }

      reject(new Error(stderr.trim() || `${command} ${args.join(' ')} exited with ${code}`))
    })
  })
}

const python = bundledPython()
if (!python) {
  throw new Error('Bundled Python runtime is missing. Run npm run prepare:python-vendor first.')
}

const version = await run(python, ['--version'])
await run(python, [
  '-c',
  [
    'from pathlib import Path',
    'for root in ("scripts", "vendor/python"):',
    '    for path in Path(root).rglob("*.py"):',
    '        compile(path.read_text(encoding="utf-8"), str(path), "exec")',
  ].join('\n'),
])
const output = await run(python, [workerPath, 'self-test'])
const payload = JSON.parse(output)

if (!payload.ok || !payload.ytDlpVersion || !payload.ffmpeg) {
  throw new Error(`Python worker self-test failed: ${output}`)
}

console.log(`${version.trim()} yt-dlp=${payload.ytDlpVersion} ffmpeg=ok`)
