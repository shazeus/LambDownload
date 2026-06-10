import cors from 'cors'
import express from 'express'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

type QualityId = '1080p' | '4k' | 'audio' | 'proxy'
type JobStage = 'queued' | 'resolving' | 'video' | 'audio' | 'muxing' | 'ready' | 'failed'

type DownloadJob = {
  id: string
  videoId: string
  title: string
  quality: QualityId
  stage: JobStage
  progress: number
  message: string
  outputPath?: string
}

type WorkerProgress = {
  type: 'progress'
  stage?: JobStage
  progress?: number
  message?: string
  outputPath?: string
}

type AppSettings = {
  autoUpdate: boolean
  releaseRepo: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const workerPath = path.join(projectRoot, 'scripts', 'python_downloader.py')
const updaterPath = path.join(projectRoot, 'scripts', 'self_update.mjs')
const packagePath = path.join(projectRoot, 'package.json')
const downloadRoot = process.env.LAMBDOWNLOAD_MEDIA_DIR ?? path.join(homedir(), 'Movies', 'LambDownload')
const configRoot = path.join(homedir(), '.lambdownload')
const settingsPath = path.join(configRoot, 'config.json')
const pythonBin = process.env.LAMBDOWNLOAD_PYTHON ?? 'python3'
const port = Number(process.env.LAMBDOWNLOAD_PORT ?? 4317)
const defaultSettings: AppSettings = {
  autoUpdate: true,
  releaseRepo: 'shazeus/LambDownload',
}

mkdirSync(downloadRoot, { recursive: true })
mkdirSync(configRoot, { recursive: true })

const app = express()
const jobs = new Map<string, DownloadJob>()

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

const jobBodySchema = z.object({
  videoId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().min(1),
  quality: z.enum(['1080p', '4k', 'audio', 'proxy']),
})

const importBodySchema = z.object({
  jobId: z.string().min(1),
  path: z.string().min(1).optional(),
  target: z.enum(['project-bin', 'timeline']),
})

const settingsSchema = z.object({
  autoUpdate: z.boolean().optional(),
  releaseRepo: z.string().min(3).optional(),
})

function currentVersion(): string {
  const payload = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string }
  return payload.version ?? '0.0.0'
}

function readSettings(): AppSettings {
  if (!existsSync(settingsPath)) {
    writeSettings(defaultSettings)
    return defaultSettings
  }

  try {
    const parsed = JSON.parse(readFileSync(settingsPath, 'utf8')) as Partial<AppSettings>
    return {
      ...defaultSettings,
      ...parsed,
    }
  } catch {
    writeSettings(defaultSettings)
    return defaultSettings
  }
}

function writeSettings(settings: AppSettings): void {
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`)
}

function versionParts(version: string): number[] {
  return version.replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0)
}

function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = versionParts(latest)
  const currentParts = versionParts(current)
  const maxLength = Math.max(latestParts.length, currentParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const latestPart = latestParts[index] ?? 0
    const currentPart = currentParts[index] ?? 0
    if (latestPart > currentPart) {
      return true
    }
    if (latestPart < currentPart) {
      return false
    }
  }

  return false
}

function runWorker(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [workerPath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }
      reject(new Error(stderr.trim() || `Python worker exited with ${code}`))
    })
  })
}

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    provider: 'python-yt-dlp',
    downloadRoot,
  })
})

app.get('/api/settings', (_request, response) => {
  response.json({ settings: readSettings() })
})

app.patch('/api/settings', (request, response) => {
  const parsed = settingsSchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).send(parsed.error.message)
    return
  }

  const settings = {
    ...readSettings(),
    ...parsed.data,
  }
  writeSettings(settings)
  response.json({ settings })
})

app.get('/api/update/check', async (_request, response) => {
  const settings = readSettings()
  const version = currentVersion()

  if (!settings.autoUpdate) {
    response.json({
      update: {
        enabled: false,
        currentVersion: version,
        updateAvailable: false,
        message: 'Auto-update is turned off',
      },
    })
    return
  }

  try {
    const releaseResponse = await fetch(`https://api.github.com/repos/${settings.releaseRepo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LambDownload',
      },
    })

    if (!releaseResponse.ok) {
      throw new Error(
        releaseResponse.status === 404
          ? 'No public release found yet'
          : `GitHub returned ${releaseResponse.status}`,
      )
    }

    const release = (await releaseResponse.json()) as {
      tag_name?: string
      html_url?: string
    }
    const latestVersion = release.tag_name ?? version
    const updateAvailable = isNewerVersion(latestVersion, version)

    response.json({
      update: {
        enabled: true,
        currentVersion: version,
        latestVersion,
        updateAvailable,
        releaseUrl: release.html_url,
        message: updateAvailable
          ? `Update available: ${latestVersion}`
          : `Current version is up to date: ${version}`,
      },
    })
  } catch (error) {
    response.json({
      update: {
        enabled: true,
        currentVersion: version,
        updateAvailable: false,
        message: error instanceof Error ? error.message : 'Could not check GitHub releases',
      },
    })
  }
})

app.post('/api/update/apply', (_request, response) => {
  const settings = readSettings()
  if (!settings.autoUpdate) {
    response.status(409).send('Auto-update is turned off')
    return
  }

  const child = spawn(process.execPath, [updaterPath, '--repo', settings.releaseRepo], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  response.status(202).json({
    result: {
      started: true,
      message: 'Update started in the background. Restart the panel after it finishes.',
    },
  })
})

app.get('/api/search', async (request, response) => {
  const query = z.string().min(1).safeParse(request.query.q)
  if (!query.success) {
    response.status(400).send('Missing search query')
    return
  }

  try {
    const stdout = await runWorker(['search', query.data])
    response.type('json').send(stdout)
  } catch (error) {
    response.status(500).send(error instanceof Error ? error.message : 'Search failed')
  }
})

app.post('/api/jobs', (request, response) => {
  const parsed = jobBodySchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).send(parsed.error.message)
    return
  }

  const id = randomUUID()
  const job: DownloadJob = {
    id,
    videoId: parsed.data.videoId,
    title: parsed.data.title,
    quality: parsed.data.quality,
    stage: 'queued',
    progress: 2,
    message: 'Queued for Python yt-dlp worker',
  }

  jobs.set(id, job)
  response.status(202).json({ job })

  const child = spawn(
    pythonBin,
    [
      workerPath,
      'download',
      parsed.data.url,
      '--quality',
      parsed.data.quality,
      '--outdir',
      downloadRoot,
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  let buffer = ''

  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) {
        continue
      }

      try {
        const event = JSON.parse(line) as WorkerProgress
        if (event.type === 'progress') {
          job.stage = event.stage ?? job.stage
          job.progress = event.progress ?? job.progress
          job.message = event.message ?? job.message
          job.outputPath = event.outputPath ?? job.outputPath
          jobs.set(id, { ...job })
        }
      } catch {
        job.message = line.trim()
        jobs.set(id, { ...job })
      }
    }
  })

  child.stderr.on('data', (chunk: Buffer) => {
    const detail = chunk.toString().trim()
    if (detail) {
      job.message = detail.slice(0, 180)
      jobs.set(id, { ...job })
    }
  })

  child.on('error', (error) => {
    job.stage = 'failed'
    job.progress = 100
    job.message = error.message
    jobs.set(id, { ...job })
  })

  child.on('close', (code) => {
    const latest = jobs.get(id) ?? job
    if (code !== 0 && latest.stage !== 'ready') {
      jobs.set(id, {
        ...latest,
        stage: 'failed',
        progress: 100,
        message: latest.message || `Download worker exited with ${code}`,
      })
    }
  })
})

app.get('/api/jobs/:id', (request, response) => {
  const job = jobs.get(request.params.id)
  if (!job) {
    response.status(404).send('Job not found')
    return
  }

  response.json({ job })
})

app.post('/api/import', (request, response) => {
  const parsed = importBodySchema.safeParse(request.body)
  if (!parsed.success) {
    response.status(400).send(parsed.error.message)
    return
  }

  const job = jobs.get(parsed.data.jobId)
  const outputPath = parsed.data.path ?? job?.outputPath

  if (!outputPath) {
    response.status(400).send('Downloaded file path is missing')
    return
  }

  if (!existsSync(outputPath)) {
    response.status(404).send('Downloaded file does not exist on disk')
    return
  }

  response.json({
    result: {
      ok: true,
      host: 'browser-demo',
      target: parsed.data.target,
      path: outputPath,
      message: `Ready for Adobe import: ${path.basename(outputPath)}`,
    },
  })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`LambDownload service listening on http://127.0.0.1:${port}`)
})
