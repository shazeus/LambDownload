# LambDownload

<p align="center">
  <img width="128" height="128" alt="LambDownload logo" src="public/logo.png">
</p>

Standalone desktop downloader for editor-ready YouTube media.

<p align="center">
  <a href="#english"><img alt="English" src="https://img.shields.io/badge/Language-EN-3178c6?style=flat-square"></a>
  <a href="#turkce"><img alt="Türkçe" src="https://img.shields.io/badge/Dil-TR-e30a17?style=flat-square"></a>
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
git tag vX.Y.Z
git push origin vX.Y.Z
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

## Türkçe

LambDownload, YouTube URL'si yapıştırarak veya arama yaparak video bulmanı, kalite seçmeni, medyayı yerel olarak indirmeni ve tamamlanan dosyayı Premiere Pro, After Effects, DaVinci Resolve, Finder, Explorer veya dosya sürükle-bırak kabul eden herhangi bir uygulamaya doğrudan taşımanı sağlar.

- **Standalone Uygulama** - Adobe extension kurulumu, CEP, UXP veya panel ayarı gerektirmez.
- **API Key Yok** - Arama ve indirme YouTube API key istemeden yerelde çalışır.
- **Paketli Runtime** - Masaüstü build'leri Python 3.13 ve indirme kütüphanelerini içerir; kullanıcılar Python veya `yt-dlp` kurmaz.
- **Editor-Safe Output** - Video indirmeleri H.264/AAC MP4, `yuv420p` ve faststart metadata ile editör uyumlu hale getirilir.
- **Drag-Out Library** - Tamamlanan dosyalar uygulamada kalır; timeline'lara veya klasörlere sürükleyebilirsin.
- **Kalite Modları** - 1080p, 4K, Audio Only ve Proxy.
- **Auto Update** - GitHub Releases kontrol eder ve uygulama içinden kapatılabilir.
- **Sponsor Ready** - GitHub sponsor butonu için `.github/FUNDING.yml` içerir.

## Kurulum

Son release'i buradan indir:

```txt
https://github.com/shazeus/LambDownload/releases/latest
```

Basit kaynak kurulumu:

```bash
npm run setup
```

Ya da çift tıkla:

- macOS: `installers/setup.command`
- Windows: `installers/setup.bat`
- Windows PowerShell: `installers/setup.ps1`

Kaynak kurulumu Node ve npm'i kontrol eder, JavaScript paketlerini kurar veya günceller, paketli Python downloader runtime'ını hazırlar, uygulamayı build eder, yerel ayarları yazar ve launcher oluşturur. Native masaüstü installer'ları runtime'ı zaten içerir.

macOS kurulumu:

<p align="center">
  <img width="766" height="720" alt="macOS kurulumu" src="https://github.com/user-attachments/assets/a90cceda-fae0-4015-8702-ab30bed672b8">
</p>

Auto-update kurulum sırasında kapatılabilir:

```bash
npm run setup -- --auto-update=false
```

## Kullanım

```bash
# Standalone masaüstü uygulamasını başlat
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

# Native desktop paketi build et
npm run desktop:pack
```

Kullanım örneği:

<p align="center">
  <img width="840" height="480" alt="LambDownload kullanım örneği" src="https://github.com/user-attachments/assets/6a1dbb04-28b8-4092-bef6-e3d376dcab8c">
</p>

Uygulama içinde:

1. YouTube URL'si yapıştır veya başlığa göre ara.
2. `1080p`, `4K`, `Audio Only` veya `Proxy` seç.
3. Medyayı local Python worker ile indir.
4. Tamamlanan dosyayı LambDownload'dan herhangi bir editör, klasör veya timeline'a sürükle.

## Çıktı

İndirmeler yerelde saklanır:

```txt
~/Movies/LambDownload
```

Video modları editör uyumlu `.mp4` dosyaları üretir:

```txt
H.264 video
AAC audio
yuv420p pixel format
faststart metadata
```

Audio-only modu `.m4a` dosyası üretir.

## Auto Update

LambDownload, local servis üzerinden `shazeus/LambDownload` GitHub Releases kontrolü yapar.

Kullanıcılar bunu uygulama içinden kapatabilir. Ayar yerelde saklanır:

```txt
~/.lambdownload/config.json
```

Manuel self-update:

```bash
npm run update:self
```

## Release

Tag oluşturup pushla:

```bash
git tag v2.1.5
git push origin v2.1.5
```

GitHub Actions şunları build edip yayınlar:

```txt
release/lambdownload-release.zip
release/lambdownload-vX.Y.Z-macos-linux.zip
release/lambdownload-vX.Y.Z-windows.zip
dist-desktop/*.dmg
dist-desktop/*.zip
dist-desktop/*.exe
```

## Nasıl Çalışır

1. React/Electron uygulaması URL veya arama terimini local Node servisine gönderir.
2. Node `scripts/python_downloader.py` dosyasını çağırır.
3. Python `yt-dlp`, metadata ve uygun formatları çözer.
4. Seçilen stream geçici klasöre indirilir.
5. ffmpeg sabit, editör uyumlu çıktı oluşturur.
6. Final dosya `~/Movies/LambDownload` klasörüne taşınır.
7. Electron dosyayı diğer uygulamalara sürükle-bırak için hazırlar.

## Sorumluluk Reddi

Yalnızca sahibi olduğun, lisanslı veya yeniden kullanmak için açık iznin olan videoları indir. LambDownload özel erişim kontrollerini aşmaz. Yetkili medya işlemleri için yerel bir workflow aracıdır.

## Author

[github/shazeus](https://github.com/shazeus)

## Support

[GitHub Sponsors](https://github.com/sponsors/shazeus)

## License

[Creative Commons Attribution-NoDerivatives 4.0 International](LICENSE)
