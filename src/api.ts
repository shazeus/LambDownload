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

const API_BASE = import.meta.env.VITE_LAMBDOWNLOAD_API ?? 'http://127.0.0.1:4317/api'

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function searchVideos(query: string): Promise<SearchResult[]> {
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
  const payload = await readJson<{ results: SearchResult[] }>(response)
  return payload.results
}

export async function createDownloadJob(video: SearchResult, quality: QualityId): Promise<DownloadJob> {
  const response = await fetch(`${API_BASE}/jobs`, {
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
  const response = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}`)
  const payload = await readJson<{ job: DownloadJob }>(response)
  return payload.job
}

export async function importDownloadedAsset(job: DownloadJob, target: ImportTarget): Promise<ImportResult> {
  const response = await fetch(`${API_BASE}/import`, {
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
  const response = await fetch(`${API_BASE}/settings`)
  const payload = await readJson<{ settings: AppSettings }>(response)
  return payload.settings
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  const payload = await readJson<{ settings: AppSettings }>(response)
  return payload.settings
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const response = await fetch(`${API_BASE}/update/check`)
  const payload = await readJson<{ update: UpdateStatus }>(response)
  return payload.update
}

export async function applyLatestUpdate(): Promise<ApplyUpdateResult> {
  const response = await fetch(`${API_BASE}/update/apply`, {
    method: 'POST',
  })
  const payload = await readJson<{ result: ApplyUpdateResult }>(response)
  return payload.result
}
