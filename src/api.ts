import type {
  AppSettings,
  ApplyUpdateResult,
  DownloadJob,
  ImportResult,
  ImportTarget,
  QualityId,
  SearchResult,
  UpdateStatus,
} from './types'

const LOCAL_API_BASES = import.meta.env.VITE_LAMBDOWNLOAD_API
  ? [import.meta.env.VITE_LAMBDOWNLOAD_API]
  : ['http://127.0.0.1:4317/api', 'http://localhost:4317/api']

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const failures: string[] = []

  for (const base of LOCAL_API_BASES) {
    try {
      return await fetch(`${base}${path}`, init)
    } catch (error) {
      failures.push(`${base}: ${error instanceof Error ? error.message : 'unreachable'}`)
    }
  }

  throw new Error(
    `Could not reach the LambDownload local service. Start "Start LambDownload.bat" or run "npm run service", then try again. Tried ${failures.join('; ')}`,
  )
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function searchVideos(query: string): Promise<SearchResult[]> {
  const response = await apiFetch(`/search?q=${encodeURIComponent(query)}`)
  const payload = await readJson<{ results: SearchResult[] }>(response)
  return payload.results
}

export async function createDownloadJob(video: SearchResult, quality: QualityId): Promise<DownloadJob> {
  const response = await apiFetch('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: video.id,
      title: video.title,
      url: video.url,
      quality,
    }),
  })

  const payload = await readJson<{ job: DownloadJob }>(response)
  return payload.job
}

export async function getDownloadJob(jobId: string): Promise<DownloadJob> {
  const response = await apiFetch(`/jobs/${encodeURIComponent(jobId)}`)
  const payload = await readJson<{ job: DownloadJob }>(response)
  return payload.job
}

export async function importDownloadedAsset(job: DownloadJob, target: ImportTarget): Promise<ImportResult> {
  const response = await apiFetch('/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: job.id,
      path: job.outputPath,
      target,
    }),
  })

  const payload = await readJson<{ result: ImportResult }>(response)
  return payload.result
}

export async function getSettings(): Promise<AppSettings> {
  const response = await apiFetch('/settings')
  const payload = await readJson<{ settings: AppSettings }>(response)
  return payload.settings
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const response = await apiFetch('/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  const payload = await readJson<{ settings: AppSettings }>(response)
  return payload.settings
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const response = await apiFetch('/update/check')
  const payload = await readJson<{ update: UpdateStatus }>(response)
  return payload.update
}

export async function applyLatestUpdate(): Promise<ApplyUpdateResult> {
  const response = await apiFetch('/update/apply', {
    method: 'POST',
  })
  const payload = await readJson<{ result: ApplyUpdateResult }>(response)
  return payload.result
}
