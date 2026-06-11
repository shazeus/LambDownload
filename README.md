# LambDownload

<p align="center">
  <img width="128" height="128" alt="LambDownload logo" src="public/logo.png">
</p>

Standalone desktop downloader for editor-ready YouTube media.

![TypeScript](https://img.shields.io/badge/TypeScript-6+-3178c6?style=flat-square)
![React](https://img.shields.io/badge/React-19-22272e?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848f?style=flat-square)
![Python](https://img.shields.io/badge/Python-yt--dlp-3776ab?style=flat-square)
![License](https://img.shields.io/badge/License-CC%20BY--ND%204.0-green?style=flat-square)

---

LambDownload lets you search or paste a YouTube URL, choose a quality, download the media locally, and drag the finished file directly into Premiere Pro, After Effects, DaVinci Resolve, Finder, Explorer, or any app that accepts file drops.

- **Standalone App** - No Adobe extension install, no CEP, no UXP, no panel setup.
- **No API Keys** - Search and download run locally without YouTube API keys.
- **Editor-Safe Output** - Video downloads are transcoded to H.264/AAC MP4 with `yuv420p` and faststart metadata.
- **Drag-Out Library** - Completed files stay in the app so you can drag them into timelines or folders.
- **Quality Modes** - 1080p, 4K, Audio Only, and Proxy.
- **Auto Update** - Checks GitHub Releases and can be turned off in the app.
- **Sponsor Ready** - Includes `.github/FUNDING.yml` for the GitHub sponsor button.

## Install

Download the latest release from:

```txt
https://github.com/shazeus/LambDownload/releases/latest
```

Simple source setup:

```bash
npm run setup
```

Or double-click:

- macOS: `installers/setup.command`
- Windows: `installers/setup.bat`
- Windows PowerShell: `installers/setup.ps1`

The setup checks Node, npm, and Python, installs or updates JavaScript packages, installs or updates Python downloader packages, builds the app, writes local settings, and creates a launcher.

Auto-update can be disabled during setup:

```bash
npm run setup -- --auto-update=false
```

## Usage

```bash
# Start the standalone desktop app
npm run desktop

# Development mode
npm run desktop:dev

# Local API only
npm run service

# Web preview only
npm run dev

# Build web assets
npm run build

# Build release zips
npm run release:pack

# Build native desktop package
npm run desktop:pack
```

Inside the app:

1. Paste a YouTube URL or search by title.
2. Pick `1080p`, `4K`, `Audio Only`, or `Proxy`.
3. Download the media through the local Python worker.
4. Drag the finished file from LambDownload into any editor, folder, or timeline.

## Output

Downloads are saved locally:

```txt
~/Movies/LambDownload
```

Video modes generate editor-safe `.mp4` files:

```txt
H.264 video
AAC audio
yuv420p pixel format
faststart metadata
```

Audio-only mode generates `.m4a` files.

## Auto Update

LambDownload checks `shazeus/LambDownload` GitHub Releases through the local service.

Users can turn this off inside the app. The setting is stored locally:

```txt
~/.lambdownload/config.json
```

Manual self-update:

```bash
npm run update:self
```

## Release

Create and push a tag:

```bash
git tag v2.0.0
git push origin v2.0.0
```

GitHub Actions builds and publishes:

```txt
release/lambdownload-release.zip
release/lambdownload-vX.Y.Z-macos-linux.zip
release/lambdownload-vX.Y.Z-windows.zip
dist-desktop/*.dmg
dist-desktop/*.zip
dist-desktop/*.exe
```

## How It Works

1. The React/Electron app sends a URL or search term to the local Node service.
2. Node calls `scripts/python_downloader.py`.
3. Python `yt-dlp` resolves metadata and available formats.
4. The selected stream is downloaded into a temporary folder.
5. ffmpeg creates a stable editor-safe output.
6. The final file is moved to `~/Movies/LambDownload`.
7. Electron exposes the file for drag-and-drop into other apps.

## Disclaimer

Only download videos you own, licensed media, or content you have explicit permission to reuse. LambDownload does not bypass private access controls. It is a local workflow tool for authorized media handling.

## Author

[github/shazeus](https://github.com/shazeus)

## Support

[GitHub Sponsors](https://github.com/sponsors/shazeus)

## License

[Creative Commons Attribution-NoDerivatives 4.0 International](LICENSE)
