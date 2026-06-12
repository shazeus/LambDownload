#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
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

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: {
        ...process.env,
        PYTHONDONTWRITEBYTECODE: '1',
        PYTHONIOENCODING: 'utf-8',
        PYTHONNOUSERSITE: '1',
        PYTHONUNBUFFERED: '1',
        ...(options.env ?? {}),
      },
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
        resolve({ stdout, stderr })
        return
      }

      reject(new Error(stderr.trim() || stdout.trim() || `${command} ${args.join(' ')} exited with ${code}`))
    })
  })
}

function parseLastJsonLine(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (const line of lines.reverse()) {
    try {
      return JSON.parse(line)
    } catch {
      // Ignore progress text that is not JSON.
    }
  }
  return null
}

function startFixtureServer(filePath) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      if (request.url !== '/fixture.mp4') {
        response.writeHead(404)
        response.end()
        return
      }

      response.writeHead(200, {
        'Content-Type': 'video/mp4',
      })
      response.end(readFileSync(filePath))
    })

    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address !== 'object') {
        reject(new Error('Could not bind smoke fixture server'))
        return
      }
      resolve({
        url: `http://127.0.0.1:${address.port}/fixture.mp4`,
        close: () => new Promise((closeResolve) => server.close(closeResolve)),
      })
    })
  })
}

const python = bundledPython()
if (!python) {
  throw new Error('Bundled Python runtime is missing. Run npm run prepare:python-vendor first.')
}

const selfTest = await run(python, [workerPath, 'self-test'])
const selfTestPayload = parseLastJsonLine(selfTest.stdout)
if (!selfTestPayload?.ffmpeg) {
  throw new Error(`Python worker self-test did not return ffmpeg: ${selfTest.stdout}`)
}

const outdir = path.join(os.tmpdir(), `lambdownload-smoke-${Date.now()}`)
await rm(outdir, { recursive: true, force: true })
await mkdir(outdir, { recursive: true })

const fixturePath = path.join(outdir, 'fixture-source.mp4')
await run(selfTestPayload.ffmpeg, [
  '-y',
  '-f',
  'lavfi',
  '-i',
  'testsrc=size=320x180:rate=24:duration=2',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=880:duration=2',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-movflags',
  '+faststart',
  fixturePath,
])

const fixtureServer = await startFixtureServer(fixturePath)

try {
  const smokeUrl = process.env.LAMBDOWNLOAD_SMOKE_URL ?? fixtureServer.url
  const download = await run(python, [workerPath, 'download', smokeUrl, '--quality', 'proxy', '--outdir', outdir])
  const payload = parseLastJsonLine(download.stdout)
  const outputPath = payload?.outputPath

  if (!outputPath || !existsSync(outputPath)) {
    throw new Error(`Smoke download did not produce an output path: ${download.stdout}`)
  }

  await run(selfTestPayload.ffmpeg, ['-v', 'error', '-i', outputPath, '-f', 'null', '-'])
  console.log(`Smoke download ok: ${outputPath}`)
} finally {
  await fixtureServer.close()
  await rm(outdir, { recursive: true, force: true })
}
