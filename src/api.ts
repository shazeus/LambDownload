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

type ApiResponse = Pick<Response, 'json' | 'ok' | 'status' | 'text'>

type NodeHttpResponse = {
  statusCode?: number
  setEncoding?: (encoding: string) => void
  on: (event: 'data' | 'end' | 'error', callback: (chunk?: string | Uint8Array | Error) => void) => void
}

type NodeHttpRequest = {
  on: (event: 'error', callback: (error: Error) => void) => void
  write: (chunk: string) => void
  end: () => void
}

type NodeHttpModule = {
  request: (
    url: URL,
    options: { headers: Record<string, string>; method: string },
    callback: (response: NodeHttpResponse) => void,
  ) => NodeHttpRequest
}

declare global {
  interface Window {
    require?: (moduleName: string) => unknown
  }
}

const LOCAL_API_BASES = import.meta.env.VITE_LAMBDOWNLOAD_API
  ? [import.meta.env.VITE_LAMBDOWNLOAD_API]
  : ['http://127.0.0.1:4317/api', 'http://localhost:4317/api']

function isNodeHttpModule(value: unknown): value is NodeHttpModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { request?: unknown }).request === 'function'
  )
}

function requestHeaders(headers: RequestInit['headers']): Record<string, string> {
  const nextHeaders: Record<string, string> = {}

  if (!headers) {
    return nextHeaders
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      nextHeaders[key] = value
    })
    return nextHeaders
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      nextHeaders[key] = value
    }
    return nextHeaders
  }

  return headers
}

function requestBody(body: RequestInit['body']): string | undefined {
  if (!body) {
    return undefined
  }

  return typeof body === 'string' ? body : String(body)
}

async function cepNodeFetch(base: string, apiPath: string, init?: RequestInit): Promise<ApiResponse> {
  const url = new URL(`${base}${apiPath}`)
  const transport = window.require?.(url.protocol === 'https:' ? 'https' : 'http')

  if (!isNodeHttpModule(transport)) {
    throw new Error('CEP Node.js bridge is not available')
  }

  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    const request = transport.request(
      url,
      {
        headers: requestHeaders(init?.headers),
        method: init?.method ?? 'GET',
      },
      (response) => {
        response.setEncoding?.('utf8')
        response.on('data', (chunk) => {
          if (typeof chunk === 'string') {
            chunks.push(chunk)
          } else if (chunk instanceof Uint8Array) {
            chunks.push(new TextDecoder().decode(chunk))
          }
        })
        response.on('end', () => {
          const body = chunks.join('')
          const status = response.statusCode ?? 0
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: async () => body,
            json: async () => JSON.parse(body),
          })
        })
        response.on('error', (error) => {
          reject(error instanceof Error ? error : new Error('CEP Node.js request failed'))
        })
      },
    )

    request.on('error', reject)
    const body = requestBody(init?.body)
    if (body) {
      request.write(body)
    }
    request.end()
  })
}

async function apiFetch(path: string, init?: RequestInit): Promise<ApiResponse> {
  const failures: string[] = []

  for (const base of LOCAL_API_BASES) {
    try {
      return await fetch(`${base}${path}`, init)
    } catch (error) {
      failures.push(`${base}: ${error instanceof Error ? error.message : 'unreachable'}`)

      try {
        return await cepNodeFetch(base, path, init)
      } catch (nodeError) {
        failures.push(
          `${base} through CEP Node.js: ${nodeError instanceof Error ? nodeError.message : 'unreachable'}`,
        )
      }
    }
  }

  throw new Error(
    `Could not reach the LambDownload local service. Start "Start LambDownload.bat" or run "npm run service", then try again. Tried ${failures.join('; ')}`,
  )
}

async function readJson<T>(response: ApiResponse): Promise<T> {
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
