import { useEffect, useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import {
  ArrowSquareOut,
  ArrowsOutCardinal,
  CheckCircle,
  DownloadSimple,
  FileVideo,
  FilmSlate,
  FolderOpen,
  GithubLogo,
  Heart,
  MagnifyingGlass,
  MusicNotes,
  PlayCircle,
  Warning,
} from '@phosphor-icons/react'
import {
  applyLatestUpdate,
  createDownloadJob,
  checkForUpdate,
  getDownloadJob,
  getSettings,
  searchVideos,
  updateSettings,
} from './api'
import type { AppSettings, DownloadJob, QualityId, SearchResult, UpdateStatus } from './types'
import './App.css'

const creatorUrl = 'https://github.com/shazeus'
const sponsorUrl = 'https://github.com/sponsors/shazeus'
const logoUrl = `${import.meta.env.BASE_URL}logo.png`

type Theme = 'dark' | 'light'

function displayName(path?: string) {
  if (!path) return 'No file yet'
  return path.split(/[\\/]/).pop() ?? path
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [quality, setQuality] = useState<QualityId>('1080p')
  const [job, setJob] = useState<DownloadJob | null>(null)
  const [downloads, setDownloads] = useState<DownloadJob[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [updateMessage, setUpdateMessage] = useState('')
  const [theme, setTheme] = useState<Theme>('dark')
  const [status, setStatus] = useState<'idle' | 'searching' | 'downloading'>('idle')
  const [error, setError] = useState('')
  const [dragHint, setDragHint] = useState('Drag completed videos into Premiere, After Effects, Resolve, Finder, or any editor.')

  const selectedQuality = useMemo(
    () => selected?.qualities.find((item) => item.id === quality) ?? selected?.qualities[0],
    [quality, selected],
  )

  const readyJob = job?.stage === 'ready' ? job : null

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    async function loadSettings() {
      try {
        const nextSettings = await getSettings()
        setSettings(nextSettings)
        if (nextSettings.autoUpdate) {
          setUpdateStatus(await checkForUpdate())
        }
      } catch {
        setSettings({
          autoUpdate: false,
          releaseRepo: 'shazeus/LambDownload',
        })
      }
    }

    void loadSettings()
  }, [])

  useEffect(() => {
    if (!job || job.stage === 'ready' || job.stage === 'failed') {
      return
    }

    const timer = window.setInterval(async () => {
      try {
        const nextJob = await getDownloadJob(job.id)
        setJob(nextJob)
        if (nextJob.stage === 'ready') {
          setDownloads((items) => [nextJob, ...items.filter((item) => item.id !== nextJob.id)].slice(0, 8))
          setStatus('idle')
          window.clearInterval(timer)
        }
        if (nextJob.stage === 'failed') {
          setStatus('idle')
          window.clearInterval(timer)
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not refresh download progress')
        setStatus('idle')
        window.clearInterval(timer)
      }
    }, 700)

    return () => window.clearInterval(timer)
  }, [job])

  async function handleSearch() {
    if (!query.trim()) {
      setError('Paste a YouTube URL or enter a search term.')
      return
    }

    setStatus('searching')
    setError('')
    setJob(null)

    try {
      const nextResults = await searchVideos(query.trim())
      setResults(nextResults)
      setSelected(nextResults[0] ?? null)
      setQuality(nextResults[0]?.qualities[0]?.id ?? '1080p')
    } catch (caught) {
      setResults([])
      setSelected(null)
      setError(caught instanceof Error ? caught.message : 'Search failed')
    } finally {
      setStatus('idle')
    }
  }

  async function handleDownload() {
    if (!selected || !selectedQuality) {
      setError('Choose a result and quality first.')
      return
    }

    setStatus('downloading')
    setError('')

    try {
      const nextJob = await createDownloadJob(selected, selectedQuality.id)
      setJob(nextJob)
    } catch (caught) {
      setStatus('idle')
      setError(caught instanceof Error ? caught.message : 'Download could not start')
    }
  }

  async function handleAutoUpdateToggle() {
    if (!settings) return

    try {
      const nextSettings = await updateSettings({ autoUpdate: !settings.autoUpdate })
      setSettings(nextSettings)
      setUpdateStatus(nextSettings.autoUpdate ? await checkForUpdate() : null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update auto-update setting')
    }
  }

  async function handleUpdateCheck() {
    try {
      setUpdateStatus(await checkForUpdate())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Update check failed')
    }
  }

  async function handleApplyUpdate() {
    try {
      const result = await applyLatestUpdate()
      setUpdateMessage(result.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start update')
    }
  }

  async function revealFile(filePath?: string) {
    if (!filePath) return
    if (window.lambdownload?.revealFile) {
      await window.lambdownload.revealFile(filePath)
      return
    }
    setDragHint('File reveal works in the desktop app. In the browser preview, copy the path below.')
  }

  async function openCreator(url: string) {
    if (window.lambdownload?.openExternal) {
      await window.lambdownload.openExternal(url)
      return
    }
    window.open(url, '_blank', 'noreferrer')
  }

  function handleFileDragStart(event: DragEvent<HTMLElement>, filePath?: string) {
    if (!filePath) return

    if (window.lambdownload?.startDrag) {
      event.preventDefault()
      window.lambdownload.startDrag(filePath)
      return
    }

    event.dataTransfer.setData('text/plain', filePath)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <main className="app-shell">
      <section className="app-frame">
        <header className="topbar">
          <button className="brand-mark" type="button" aria-label="LambDownload">
            <img src={logoUrl} alt="" />
          </button>
          <div className="brand-copy">
            <strong>LambDownload</strong>
            <span>Standalone media downloader</span>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button className={settings?.autoUpdate ? 'switch is-on' : 'switch'} type="button" onClick={handleAutoUpdateToggle}>
              Auto update {settings?.autoUpdate ? 'On' : 'Off'}
            </button>
          </div>
        </header>

        <section className="search-deck" aria-label="Search controls">
          <label className="search-field">
            <MagnifyingGlass size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSearch()
              }}
              placeholder="Paste a YouTube URL or search for a video"
            />
          </label>
          <button className="primary-button" type="button" onClick={handleSearch} disabled={status === 'searching'}>
            {status === 'searching' ? 'Searching' : 'Search'}
          </button>
        </section>

        <section className="update-strip" aria-label="Update controls">
          <span>{updateStatus?.message ?? (settings?.autoUpdate ? 'Release checks enabled' : 'Release checks disabled')}</span>
          <div>
            <button className="text-button" type="button" onClick={handleUpdateCheck}>Check</button>
            {updateStatus?.updateAvailable ? (
              <button className="text-button strong" type="button" onClick={handleApplyUpdate}>Install</button>
            ) : null}
          </div>
        </section>
        {updateMessage ? <p className="update-message">{updateMessage}</p> : null}

        {error ? (
          <div className="alert" role="alert">
            <Warning size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="main-grid">
          <div className="panel">
            <div className="section-heading">
              <h2>Sources</h2>
              <span>{results.length ? `${results.length} results` : 'No search yet'}</span>
            </div>
            {results.length === 0 ? (
              <div className="empty-state">
                <PlayCircle size={36} />
                <p>Results appear here with title, channel, duration, and reuse reminder.</p>
              </div>
            ) : (
              <div className="result-list">
                {results.map((result) => (
                  <button
                    className={selected?.id === result.id ? 'result is-active' : 'result'}
                    key={result.id}
                    type="button"
                    onClick={() => {
                      setSelected(result)
                      setQuality(result.qualities[0]?.id ?? '1080p')
                      setJob(null)
                    }}
                  >
                    <img src={result.thumbnail} alt="" />
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.channel} / {result.duration}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="panel prepare-panel">
            <div className="section-heading">
              <h2>Prepare</h2>
              <span>{selected ? 'Ready to download' : 'Choose a source'}</span>
            </div>

            {selected ? (
              <>
                <div className="selected-source">
                  <img src={selected.thumbnail} alt="" />
                  <div>
                    <h3>{selected.title}</h3>
                    <p>{selected.rightsNote}</p>
                  </div>
                </div>

                <div className="quality-grid" aria-label="Quality selection">
                  {selected.qualities.map((item) => (
                    <button
                      className={quality === item.id ? 'quality is-active' : 'quality'}
                      key={item.id}
                      type="button"
                      onClick={() => setQuality(item.id)}
                    >
                      {item.id === 'audio' ? <MusicNotes size={21} /> : <FileVideo size={21} />}
                      <span>{item.label}</span>
                      <small>{item.detail}</small>
                    </button>
                  ))}
                </div>

                <div className="progress-panel">
                  <div>
                    <span>{job?.message ?? 'Waiting for a download job'}</span>
                    <strong>{job ? `${job.progress}%` : '0%'}</strong>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${job?.progress ?? 0}%` }} />
                  </div>
                  <code>{displayName(job?.outputPath)}</code>
                </div>

                <div className="action-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={handleDownload}
                    disabled={status === 'downloading'}
                  >
                    <DownloadSimple size={18} />
                    {status === 'downloading' ? 'Downloading' : 'Download'}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void revealFile(readyJob?.outputPath)} disabled={!readyJob?.outputPath}>
                    <FolderOpen size={18} />
                    Reveal
                  </button>
                </div>

                {readyJob ? (
                  <div
                    className="drag-card"
                    draggable
                    onDragStart={(event) => handleFileDragStart(event, readyJob.outputPath)}
                  >
                    <ArrowsOutCardinal size={26} />
                    <span>
                      <strong>Drag this file into any app</strong>
                      <small>{displayName(readyJob.outputPath)}</small>
                    </span>
                    <CheckCircle size={22} weight="fill" />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-state">
                <FilmSlate size={36} />
                <p>Select a source to choose 1080p, 4K, proxy, or audio-only output.</p>
              </div>
            )}
          </div>

          <aside className="panel library-panel">
            <div className="section-heading">
              <h2>Library</h2>
              <span>{downloads.length ? 'Latest files' : 'Empty'}</span>
            </div>
            <p className="library-hint">{dragHint}</p>
            <div className="download-list">
              {downloads.length === 0 ? (
                <div className="mini-empty">Finished downloads will stay here for quick drag-out.</div>
              ) : (
                downloads.map((item) => (
                  <div
                    className="download-item"
                    draggable
                    key={item.id}
                    onDragStart={(event) => handleFileDragStart(event, item.outputPath)}
                  >
                    <FileVideo size={21} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{displayName(item.outputPath)} / {item.quality}</small>
                    </span>
                    <button type="button" aria-label="Reveal file" onClick={() => void revealFile(item.outputPath)}>
                      <FolderOpen size={17} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>

        <footer className="footer">
          <button className="profile-link" type="button" onClick={() => void openCreator(creatorUrl)}>
            <img src="https://github.com/shazeus.png?size=96" alt="Shazeus GitHub profile" />
            <span>github/shazeus</span>
            <GithubLogo size={18} />
          </button>
          <button className="support-link" type="button" onClick={() => void openCreator(sponsorUrl)}>
            <Heart size={16} weight="fill" />
            Support
            <ArrowSquareOut size={16} />
          </button>
        </footer>
      </section>
    </main>
  )
}

export default App
