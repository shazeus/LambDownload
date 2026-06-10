import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  DownloadSimple,
  FilmSlate,
  FolderSimple,
  Heart,
  ArrowSquareIn,
  MagnifyingGlass,
  MusicNotes,
  PlayCircle,
  ShieldCheck,
  UserFocus,
  Warning,
} from '@phosphor-icons/react'
import {
  applyLatestUpdate,
  createDownloadJob,
  checkForUpdate,
  getDownloadJob,
  getSettings,
  importDownloadedAsset,
  searchVideos,
  updateSettings,
} from './api'
import { importWithAdobeHost } from './adobeHost'
import type {
  AppSettings,
  DownloadJob,
  ImportResult,
  ImportTarget,
  QualityId,
  SearchResult,
  UpdateStatus,
} from './types'
import './App.css'

const creatorUrl = 'https://github.com/shazeus'
const sponsorUrl = 'https://github.com/sponsors/shazeus'

function App() {
  const [query, setQuery] = useState('https://www.youtube.com/watch?v=example')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [quality, setQuality] = useState<QualityId>('1080p')
  const [target, setTarget] = useState<ImportTarget>('project-bin')
  const [job, setJob] = useState<DownloadJob | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [updateMessage, setUpdateMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'searching' | 'downloading' | 'importing'>('idle')
  const [error, setError] = useState('')

  const selectedQuality = useMemo(
    () => selected?.qualities.find((item) => item.id === quality) ?? selected?.qualities[0],
    [quality, selected],
  )

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
        if (nextJob.stage === 'ready' || nextJob.stage === 'failed') {
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
    setImportResult(null)
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
    setImportResult(null)

    try {
      const nextJob = await createDownloadJob(selected, selectedQuality.id)
      setJob(nextJob)
    } catch (caught) {
      setStatus('idle')
      setError(caught instanceof Error ? caught.message : 'Download could not start')
    }
  }

  async function handleImport() {
    if (!job?.outputPath) {
      setError('Download must finish before import.')
      return
    }

    setStatus('importing')
    setError('')

    try {
      const hostResult = await importWithAdobeHost(job.outputPath, target)
      const result = hostResult ?? (await importDownloadedAsset(job, target))
      setImportResult(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import failed')
    } finally {
      setStatus('idle')
    }
  }

  async function handleAutoUpdateToggle() {
    if (!settings) {
      return
    }

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

  return (
    <main className="shell">
      <aside className="rail" aria-label="Project status">
        <a className="creator" href={creatorUrl} target="_blank" rel="noreferrer">
          <img src="https://github.com/shazeus.png?size=96" alt="Shazeus GitHub profile picture" />
          <span>github/shazeus</span>
        </a>
        <a className="sponsor" href={sponsorUrl} target="_blank" rel="noreferrer">
          <Heart size={16} weight="fill" />
          Sponsor
        </a>

        <div className="rail-section">
          <p className="eyebrow">Pipeline</p>
          <div className="step active">
            <MagnifyingGlass size={18} />
            Resolve source
          </div>
          <div className={job ? 'step active' : 'step'}>
            <DownloadSimple size={18} />
            Download streams
          </div>
          <div className={job?.stage === 'ready' ? 'step active' : 'step'}>
            <FilmSlate size={18} />
            Merge media
          </div>
          <div className={importResult ? 'step active' : 'step'}>
            <ArrowSquareIn size={18} />
            Import asset
          </div>
        </div>

        <div className="note">
          <ShieldCheck size={18} />
          <span>Use only videos you own, licensed media, or sources you are allowed to reuse.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="hero">
          <div>
            <p className="eyebrow">Adobe Premiere Pro + After Effects</p>
            <h1>LambDownload</h1>
            <p className="lead">
              Search, prepare, and import authorized YouTube media into an active editing project
              without leaving the Adobe panel.
            </p>
          </div>
          <div className="host-card" aria-label="Supported hosts">
            <UserFocus size={22} />
            <span>UXP for Premiere</span>
            <span>CEP bridge for After Effects</span>
          </div>
        </header>

        <section className="control-strip" aria-label="Search controls">
          <label className="input-block">
            <span>URL or search</span>
            <div className="search-field">
              <MagnifyingGlass size={20} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Paste a YouTube URL or search by title"
              />
            </div>
          </label>
          <button className="primary-button" type="button" onClick={handleSearch} disabled={status === 'searching'}>
            {status === 'searching' ? 'Searching' : 'Search'}
          </button>
        </section>

        <section className="update-strip" aria-label="Update controls">
          <div>
            <strong>Auto update</strong>
            <span>
              {updateStatus?.message ??
                (settings?.autoUpdate ? 'Release checks are enabled' : 'Release checks are disabled')}
            </span>
          </div>
          <div className="update-actions">
            <button className={settings?.autoUpdate ? 'toggle active' : 'toggle'} type="button" onClick={handleAutoUpdateToggle}>
              {settings?.autoUpdate ? 'On' : 'Off'}
            </button>
            <button className="secondary-button compact" type="button" onClick={handleUpdateCheck}>
              Check
            </button>
            {updateStatus?.updateAvailable ? (
              <button className="primary-button compact" type="button" onClick={handleApplyUpdate}>
                Install
              </button>
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

        <section className="content-grid">
          <div className="results-pane">
            <div className="section-heading">
              <h2>Results</h2>
              <span>{results.length ? `${results.length} found` : 'Waiting for input'}</span>
            </div>

            {results.length === 0 ? (
              <div className="empty-state">
                <PlayCircle size={34} />
                <p>Search results will appear here with title, source, duration, and reuse note.</p>
              </div>
            ) : (
              <div className="result-list">
                {results.map((result) => (
                  <button
                    className={selected?.id === result.id ? 'result active' : 'result'}
                    key={result.id}
                    type="button"
                    onClick={() => {
                      setSelected(result)
                      setQuality(result.qualities[0]?.id ?? '1080p')
                      setJob(null)
                      setImportResult(null)
                    }}
                  >
                    <img src={result.thumbnail} alt="" />
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.channel} - {result.duration}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="detail-pane">
            <div className="section-heading">
              <h2>Prepare</h2>
              <span>{selected ? 'Source selected' : 'No source'}</span>
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
                      className={quality === item.id ? 'quality active' : 'quality'}
                      key={item.id}
                      type="button"
                      onClick={() => setQuality(item.id)}
                    >
                      {item.id === 'audio' ? <MusicNotes size={20} /> : <FilmSlate size={20} />}
                      <span>{item.label}</span>
                      <small>{item.detail}</small>
                    </button>
                  ))}
                </div>

                <div className="target-row">
                  <button
                    className={target === 'project-bin' ? 'target active' : 'target'}
                    type="button"
                    onClick={() => setTarget('project-bin')}
                  >
                    <FolderSimple size={18} />
                    Project bin
                  </button>
                  <button
                    className={target === 'timeline' ? 'target active' : 'target'}
                    type="button"
                    onClick={() => setTarget('timeline')}
                  >
                    <PlayCircle size={18} />
                    Timeline
                  </button>
                </div>

                <div className="progress-panel">
                  <div>
                    <span>{job?.message ?? 'Ready to create a download job'}</span>
                    <strong>{job ? `${job.progress}%` : '0%'}</strong>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${job?.progress ?? 0}%` }} />
                  </div>
                  {job?.outputPath ? <code>{job.outputPath}</code> : null}
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
                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleImport}
                    disabled={!job?.outputPath || status === 'importing'}
                  >
                    <ArrowSquareIn size={18} />
                    {status === 'importing' ? 'Importing' : 'Import to Project'}
                  </button>
                </div>

                {importResult ? (
                  <div className="success">
                    <CheckCircle size={18} weight="fill" />
                    <span>{importResult.message}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-state detail-empty">
                <FilmSlate size={34} />
                <p>Select a result to choose quality, download target, and Adobe import mode.</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
