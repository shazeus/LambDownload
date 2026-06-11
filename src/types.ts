export type QualityId = '1080p' | '4k' | 'audio' | 'proxy'

export type QualityOption = {
  id: QualityId
  label: string
  detail: string
}

export type SearchResult = {
  id: string
  title: string
  channel: string
  duration: string
  thumbnail: string
  url: string
  rightsNote: string
  qualities: QualityOption[]
}

export type JobStage =
  | 'queued'
  | 'resolving'
  | 'video'
  | 'audio'
  | 'muxing'
  | 'transcoding'
  | 'ready'
  | 'failed'

export type DownloadJob = {
  id: string
  videoId: string
  title: string
  quality: QualityId
  stage: JobStage
  progress: number
  message: string
  outputPath?: string
}

export type ImportTarget = 'project-bin' | 'timeline'

export type ImportResult = {
  ok: boolean
  host: 'premiere' | 'after-effects' | 'browser-demo'
  target: ImportTarget
  path: string
  message: string
}

export type AppSettings = {
  autoUpdate: boolean
  releaseRepo: string
}

export type UpdateStatus = {
  enabled: boolean
  currentVersion: string
  latestVersion?: string
  updateAvailable: boolean
  releaseUrl?: string
  message: string
}

export type ApplyUpdateResult = {
  started: boolean
  message: string
}

export type LambDownloadDesktopApi = {
  isDesktop: boolean
  startDrag: (filePath: string) => Promise<boolean>
  revealFile: (filePath: string) => Promise<boolean>
  openExternal: (url: string) => Promise<boolean>
}

declare global {
  interface Window {
    lambdownload?: LambDownloadDesktopApi
  }
}
