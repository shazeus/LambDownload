# LambDownload

<img width="1640" height="664" alt="Yeni Proje (1)" src="https://github.com/user-attachments/assets/dafc6eb4-80f0-484c-80aa-1f009b29f5aa" />

Adobe Premiere Pro and After Effects panel for searching, downloading, and importing authorized YouTube media.

![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178c6?style=flat-square)
![React](https://img.shields.io/badge/React-19-22272e?style=flat-square)
![Python](https://img.shields.io/badge/Python-yt--dlp-3776ab?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

LambDownload is a local Adobe extension workflow. The panel runs inside Premiere Pro or After Effects, talks to a local companion service, downloads with the Python `yt-dlp` package, merges streams with Python-managed ffmpeg support, and imports the finished file back into the active project.

- **Adobe Panel** - React UI for URL input, search, quality selection, progress, and import.
- **Python Downloader** - Uses the Python `yt-dlp` module instead of `yt-dlp.exe`.
- **No API Keys** - Users do not need YouTube API keys for search or download.
- **Stream Merging** - Handles high-res video/audio stream merging through ffmpeg.
- **Auto Update** - Checks GitHub Releases and can be turned off from the panel.

## Install

Simple setup:

```bash
npm run setup
```

Or double-click:

- macOS: `installers/setup.command`
- Windows: `installers/setup.bat`
- Windows PowerShell: `installers/setup.ps1`

The setup asks where to install:

1. After Effects
2. Premiere Pro
3. Both
4. Dependencies only

It checks Node, npm, and Python, installs missing packages, updates old Python downloader packages, builds the panel, and copies the Adobe extension files into the local Adobe extension folders.

On Windows, setup tries Python in this order:

```txt
py -3
python
python3
```

If dependencies already exist, setup skips or reuses them. If Python downloader packages are old, setup updates them.

Non-interactive setup:

```bash
npm run setup -- --target=after
npm run setup -- --target=premiere
npm run setup -- --target=both
npm run setup -- --target=deps
```

Legacy install command:

```bash
npm run install:app
```

Or use the platform installer:

```bash
sh installers/install.sh
```

Windows PowerShell:

```powershell
.\installers\install.ps1
```

## Development

```bash
npm run dev:all
```

This starts:

| Service | URL |
|---------|-----|
| Panel | `http://localhost:5173` |
| Local API | `http://127.0.0.1:4317` |

## Usage

```bash
# Install Python downloader dependencies only
npm run setup:python

# Start local companion service
npm run service

# Build the panel
npm run build

# Package release zip
npm run release:pack
```

Inside the panel:

1. Paste a YouTube URL or search by title.
2. Pick `1080p`, `4K`, `Audio Only`, or `Proxy`.
3. Download the media through the Python worker.
4. Import the finished file into the project bin or active timeline.

<img width="1080" height="1186" alt="0610(2) (1)" src="https://github.com/user-attachments/assets/f43e3411-06df-4fe5-b082-33b329379b55" />

## Auto Update

LambDownload checks `shazeus/LambDownload` GitHub Releases through the local service.

Users can turn this off inside the panel. The setting is stored locally:

```txt
~/.lambdownload/config.json
```

Manual self-update:

```bash
npm run update:self
```

## Adobe Hosts

| Host | Bridge |
|------|--------|
| Premiere Pro 25.6+ | UXP |
| Premiere Pro legacy | CEP / ExtendScript |
| After Effects | CEP / ExtendScript |

CEP files live in `adobe/cep`. UXP metadata lives in `adobe/uxp`.

## How It Works

1. The panel sends a URL or search term to the local Node service.
2. Node calls `scripts/python_downloader.py`.
3. Python `yt-dlp` resolves metadata and available formats.
4. The user selects quality.
5. Python downloads and merges streams.
6. The final file is saved to `~/Movies/LambDownload`.
7. The Adobe host bridge imports that local file into the project.

## Release

Create and push a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds and publishes:

```txt
lambdownload-release.zip
lambdownload-vX.Y.Z-macos-linux.zip
lambdownload-vX.Y.Z-windows.zip
```

## Disclaimer

Only download videos you own, licensed media, or content you have explicit permission to reuse. LambDownload does not bypass private access controls. It is a local workflow tool for authorized editing use.

## Author

[github/shazeus](https://github.com/shazeus)

## License

[MIT](LICENSE)
