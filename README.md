# LambDownload

<p align="center">
  <img width="128" height="128" alt="LambDownload logo" src="public/logo.png">
</p>

Standalone desktop downloader for editor-ready YouTube media.

<p align="center">
  <a href="#english"><img alt="English" src="https://img.shields.io/badge/Language-EN-3178c6?style=flat-square"></a>
  <a href="#turkce"><img alt="Turkce" src="https://img.shields.io/badge/Dil-TR-e30a17?style=flat-square"></a>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6+-3178c6?style=flat-square">
  <img alt="React" src="https://img.shields.io/badge/React-19-22272e?style=flat-square">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-Desktop-47848f?style=flat-square">
  <img alt="Python" src="https://img.shields.io/badge/Python-yt--dlp-3776ab?style=flat-square">
  <img alt="License" src="https://img.shields.io/badge/License-CC%20BY--ND%204.0-green?style=flat-square">
</p>

---

<a id="english"></a>

## English

LambDownload lets you search or paste a YouTube URL, choose a quality, download the media locally, and drag the finished file directly into Premiere Pro, After Effects, DaVinci Resolve, Finder, Explorer, or any app that accepts file drops.

- **Standalone App** - No Adobe extension install, no CEP, no UXP, no panel setup.
- **No API Keys** - Search and download run locally without YouTube API keys.
- **Bundled Runtime** - Desktop builds include Python 3.13 and downloader libraries, so users do not install Python or `yt-dlp`.
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

The source setup checks Node and npm, installs or updates JavaScript packages, prepares the bundled Python downloader runtime, builds the app, writes local settings, and creates a launcher. Native desktop installers already include the runtime.

macOS installation:

<p align="center">
  <img width="766" height="720" alt="macOS installation" src="https://github.com/user-attachments/assets/a90cceda-fae0-4015-8702-ab30bed672b8">
</p>

- macOS installation;

<img width="766" height="720" alt="macos instalation" src="https://github.com/user-attachments/assets/a90cceda-fae0-4015-8702-ab30bed672b8" />

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
Usage example;

<img width="840" height="480" alt="0611 (1)" src="https://github.com/user-attachments/assets/6a1dbb04-28b8-4092-bef6-e3d376dcab8c" />

Usage example:

<p align="center">
  <img width="840" height="480" alt="LambDownload usage example" src="https://github.com/user-attachments/assets/6a1dbb04-28b8-4092-bef6-e3d376dcab8c">
</p>

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
git tag v2.1.0
git push origin v2.1.0
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

---

<a id="turkce"></a>

## Turkce

LambDownload, YouTube URL'si yapistirarak veya arama yaparak video bulmani, kalite secmeni, medyayi yerel olarak indirmeni ve tamamlanan dosyayi Premiere Pro, After Effects, DaVinci Resolve, Finder, Explorer veya dosya surukle-birak kabul eden herhangi bir uygulamaya dogrudan tasimani saglar.

- **Standalone Uygulama** - Adobe extension kurulumu, CEP, UXP veya panel ayari gerektirmez.
- **API Key Yok** - Arama ve indirme YouTube API key istemeden yerelde calisir.
- **Paketli Runtime** - Masaustu build'leri Python 3.13 ve indirme kutuphanelerini icerir; kullanicilar Python veya `yt-dlp` kurmaz.
- **Editor-Safe Output** - Video indirmeleri H.264/AAC MP4, `yuv420p` ve faststart metadata ile editor uyumlu hale getirilir.
- **Drag-Out Library** - Tamamlanan dosyalar uygulamada kalir; timeline'lara veya klasorlere surukleyebilirsin.
- **Kalite Modlari** - 1080p, 4K, Audio Only ve Proxy.
- **Auto Update** - GitHub Releases kontrol eder ve uygulama icinden kapatilabilir.
- **Sponsor Ready** - GitHub sponsor butonu icin `.github/FUNDING.yml` icerir.

## Kurulum

Son release'i buradan indir:

```txt
https://github.com/shazeus/LambDownload/releases/latest
```

Basit kaynak kurulumu:

```bash
npm run setup
```

Ya da cift tikla:

- macOS: `installers/setup.command`
- Windows: `installers/setup.bat`
- Windows PowerShell: `installers/setup.ps1`

Kaynak kurulumu Node ve npm'i kontrol eder, JavaScript paketlerini kurar veya gunceller, paketli Python downloader runtime'ini hazirlar, uygulamayi build eder, yerel ayarlari yazar ve launcher olusturur. Native masaustu installer'lari runtime'i zaten icerir.

macOS kurulumu:

<p align="center">
  <img width="766" height="720" alt="macOS kurulumu" src="https://github.com/user-attachments/assets/a90cceda-fae0-4015-8702-ab30bed672b8">
</p>

Auto-update kurulum sirasinda kapatilabilir:

```bash
npm run setup -- --auto-update=false
```

## Kullanim

```bash
# Standalone masaustu uygulamasini baslat
npm run desktop

# Development modu
npm run desktop:dev

# Sadece local API
npm run service

# Sadece web preview
npm run dev

# Web asset build
npm run build

# Release zip build
npm run release:pack

# Native desktop paket build
npm run desktop:pack
```

Kullanim ornegi:

<p align="center">
  <img width="840" height="480" alt="LambDownload kullanim ornegi" src="https://github.com/user-attachments/assets/6a1dbb04-28b8-4092-bef6-e3d376dcab8c">
</p>

Uygulama icinde:

1. YouTube URL'si yapistir veya basliga gore ara.
2. `1080p`, `4K`, `Audio Only` veya `Proxy` sec.
3. Medyayi local Python worker ile indir.
4. Tamamlanan dosyayi LambDownload'dan herhangi bir editor, klasor veya timeline'a surukle.

## Cikti

Indirmeler yerelde saklanir:

```txt
~/Movies/LambDownload
```

Video modlari editor uyumlu `.mp4` dosyalari uretir:

```txt
H.264 video
AAC audio
yuv420p pixel format
faststart metadata
```

Audio-only modu `.m4a` dosyasi uretir.

## Auto Update

LambDownload, local servis uzerinden `shazeus/LambDownload` GitHub Releases kontrolu yapar.

Kullanicilar bunu uygulama icinden kapatabilir. Ayar yerelde saklanir:

```txt
~/.lambdownload/config.json
```

Manuel self-update:

```bash
npm run update:self
```

## Release

Tag olusturup pushla:

```bash
git tag v2.1.0
git push origin v2.1.0
```

GitHub Actions sunlari build edip yayinlar:

```txt
release/lambdownload-release.zip
release/lambdownload-vX.Y.Z-macos-linux.zip
release/lambdownload-vX.Y.Z-windows.zip
dist-desktop/*.dmg
dist-desktop/*.zip
dist-desktop/*.exe
```

## Nasil Calisir

1. React/Electron uygulamasi URL veya arama terimini local Node servisine gonderir.
2. Node `scripts/python_downloader.py` dosyasini cagirir.
3. Python `yt-dlp`, metadata ve uygun formatlari cozer.
4. Secilen stream gecici klasore indirilir.
5. ffmpeg sabit, editor uyumlu cikti olusturur.
6. Final dosya `~/Movies/LambDownload` klasorune tasinir.
7. Electron dosyayi diger uygulamalara surukle-birak icin hazirlar.

## Sorumluluk Reddi

Yalnizca sahibi oldugun, lisansli veya yeniden kullanmak icin acik iznin olan videolari indir. LambDownload ozel erisim kontrollerini asmaz. Yetkili medya islemleri icin yerel bir workflow aracidir.

## Author

[github/shazeus](https://github.com/shazeus)

## Support

[GitHub Sponsors](https://github.com/sponsors/shazeus)

## License

[Creative Commons Attribution-NoDerivatives 4.0 International](LICENSE)
