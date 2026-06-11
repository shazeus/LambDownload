#!/usr/bin/env python3
import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


QUALITIES = [
    {"id": "1080p", "label": "1080p", "detail": "Best editor-safe HD merge"},
    {"id": "4k", "label": "4K", "detail": "Highest editor-safe video copy"},
    {"id": "audio", "label": "Audio Only", "detail": "Extracted m4a track"},
    {"id": "proxy", "label": "Proxy", "detail": "Fast 720p editing copy"},
]


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def load_yt_dlp():
    try:
        import yt_dlp

        return yt_dlp
    except ImportError:
        print(
            "Missing Python dependency. Run: python3 -m pip install -r requirements.txt",
            file=sys.stderr,
        )
        raise


def ffmpeg_location() -> str | None:
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def duration_label(seconds: Any) -> str:
    if not isinstance(seconds, (int, float)) or seconds <= 0:
        return "Unknown"
    seconds = int(seconds)
    minutes, sec = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{sec:02d}"
    return f"{minutes}:{sec:02d}"


def normalize_video(entry: dict[str, Any]) -> dict[str, Any]:
    video_id = entry.get("id") or entry.get("display_id") or "unknown"
    title = entry.get("title") or "Untitled YouTube source"
    channel = entry.get("uploader") or entry.get("channel") or "YouTube"
    url = entry.get("webpage_url") or entry.get("url") or f"https://www.youtube.com/watch?v={video_id}"
    if url and url.startswith("/watch"):
        url = f"https://www.youtube.com{url}"
    if url and not url.startswith("http"):
        url = f"https://www.youtube.com/watch?v={video_id}"

    thumbnails = entry.get("thumbnails") or []
    thumbnail = ""
    if thumbnails:
        thumbnail = thumbnails[-1].get("url") or ""
    if not thumbnail and video_id != "unknown":
        thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

    return {
        "id": str(video_id),
        "title": title,
        "channel": channel,
        "duration": duration_label(entry.get("duration")),
        "thumbnail": thumbnail,
        "url": url,
        "rightsNote": "Confirm ownership, license, or explicit reuse permission before downloading.",
        "qualities": QUALITIES,
    }


def search(query: str) -> None:
    yt_dlp = load_yt_dlp()
    source = query if query.startswith(("http://", "https://")) else f"ytsearch8:{query}"

    options = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "skip_download": True,
        "extract_flat": False,
        "noplaylist": True,
    }

    location = ffmpeg_location()
    if location:
        options["ffmpeg_location"] = location

    with yt_dlp.YoutubeDL(options) as ydl:
        data = ydl.extract_info(source, download=False)

    entries = data.get("entries") if isinstance(data, dict) else None
    raw_results = entries if entries else [data]
    results = [normalize_video(item) for item in raw_results if isinstance(item, dict)]
    emit({"results": results})


def format_selector(quality: str) -> str:
    if quality == "4k":
        return (
            "bestvideo[height<=2160][vcodec^=avc1][ext=mp4]+bestaudio[acodec^=mp4a][ext=m4a]/"
            "bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/"
            "best[height<=2160]/best"
        )
    if quality == "audio":
        return "bestaudio/best"
    if quality == "proxy":
        return (
            "bestvideo[height<=720][vcodec^=avc1][ext=mp4]+bestaudio[acodec^=mp4a][ext=m4a]/"
            "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/"
            "best[height<=720]/best"
        )
    return (
        "bestvideo[height<=1080][vcodec^=avc1][ext=mp4]+bestaudio[acodec^=mp4a][ext=m4a]/"
        "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/"
        "best[height<=1080]/best"
    )


def stage_from_status(status: dict[str, Any], quality: str) -> str:
    filename = str(status.get("filename") or "").lower()
    if status.get("status") == "finished":
        return "muxing" if quality != "audio" else "ready"
    if "audio" in filename or filename.endswith((".m4a", ".webm", ".opus")):
        return "audio"
    return "video"


def newest_output(outdir: Path, video_id: str) -> str | None:
    matches = glob.glob(str(outdir / f"*{video_id}*"))
    files = [Path(item) for item in matches if Path(item).is_file()]
    if not files:
        return None
    return str(max(files, key=lambda item: item.stat().st_mtime))


def safe_stem(title: str, video_id: str, quality: str) -> str:
    raw = f"{title[:80]}-{video_id}-{quality}"
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", raw).strip("._-")
    return stem or f"lambdownload-{video_id}-{quality}"


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path

    for index in range(2, 1000):
        candidate = path.with_name(f"{path.stem}-{index}{path.suffix}")
        if not candidate.exists():
            return candidate

    raise RuntimeError(f"Could not create a unique output path for {path.name}")


def validate_output(path: Path, minimum_bytes: int = 32_000) -> None:
    if not path.exists() or not path.is_file():
        raise RuntimeError(f"Expected output file was not created: {path}")
    if path.stat().st_size < minimum_bytes:
        raise RuntimeError(f"Output file is too small to be valid: {path}")


def transcode_editor_mp4(source: Path, destination: Path, quality: str, ffmpeg: str | None) -> None:
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required for editor-safe MP4 output. Run setup again to install imageio-ffmpeg.")

    crf = "22" if quality == "proxy" else "18"
    emit(
        {
            "type": "progress",
            "stage": "transcoding",
            "progress": 94,
            "message": "Creating editor-safe H.264/AAC MP4",
        }
    )

    command = [
        ffmpeg,
        "-y",
        "-i",
        str(source),
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        crf,
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        str(destination),
    ]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    if result.returncode != 0:
        detail = result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "ffmpeg failed"
        raise RuntimeError(f"Could not create editor-safe MP4: {detail}")

    validate_output(destination)


def download(url: str, quality: str, outdir: str) -> None:
    yt_dlp = load_yt_dlp()
    output_dir = Path(outdir).expanduser()
    output_dir.mkdir(parents=True, exist_ok=True)
    location = ffmpeg_location()

    emit({"type": "progress", "stage": "resolving", "progress": 5, "message": "Resolving YouTube formats"})

    def hook(status: dict[str, Any]) -> None:
        if status.get("status") == "downloading":
            total = status.get("total_bytes") or status.get("total_bytes_estimate") or 0
            downloaded = status.get("downloaded_bytes") or 0
            percent = int((downloaded / total) * 82) + 8 if total else 12
            emit(
                {
                    "type": "progress",
                    "stage": stage_from_status(status, quality),
                    "progress": min(percent, 90),
                    "message": "Downloading media streams",
                }
            )
        elif status.get("status") == "finished":
            emit(
                {
                    "type": "progress",
                    "stage": "muxing",
                    "progress": 92,
                    "message": "Merging streams with ffmpeg",
                }
            )

    with tempfile.TemporaryDirectory(prefix="lambdownload-") as temp_root:
        temp_dir = Path(temp_root)
        options: dict[str, Any] = {
            "format": format_selector(quality),
            "outtmpl": str(temp_dir / "%(title).80s-%(id)s.%(ext)s"),
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
            "progress_hooks": [hook],
            "merge_output_format": "mp4",
            "restrictfilenames": True,
            "continuedl": True,
            "retries": 10,
            "fragment_retries": 10,
        }

        if location:
            options["ffmpeg_location"] = location

        if quality == "audio":
            options["postprocessors"] = [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "m4a",
                    "preferredquality": "0",
                }
            ]

        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=True)

        video_id = str(info.get("id") or "")
        output_path = newest_output(temp_dir, video_id)
        if not output_path:
            raise RuntimeError("Download finished but output file could not be located")

        source = Path(output_path)
        title = str(info.get("title") or "LambDownload")
        if quality == "audio":
            destination = unique_path(output_dir / f"{safe_stem(title, video_id, quality)}.m4a")
            shutil.move(str(source), destination)
            validate_output(destination, minimum_bytes=8_000)
        else:
            destination = unique_path(output_dir / f"{safe_stem(title, video_id, quality)}.mp4")
            transcode_editor_mp4(source, destination, quality, location)

    emit(
        {
            "type": "progress",
            "stage": "ready",
            "progress": 100,
            "message": "Download ready to drag into any app",
            "outputPath": str(destination),
        }
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="LambDownload Python yt-dlp worker")
    subparsers = parser.add_subparsers(dest="command", required=True)

    search_parser = subparsers.add_parser("search")
    search_parser.add_argument("query")

    download_parser = subparsers.add_parser("download")
    download_parser.add_argument("url")
    download_parser.add_argument("--quality", choices=["1080p", "4k", "audio", "proxy"], default="1080p")
    download_parser.add_argument("--outdir", default=os.path.expanduser("~/Movies/LambDownload"))

    args = parser.parse_args()
    if args.command == "search":
        search(args.query)
    elif args.command == "download":
        download(args.url, args.quality, args.outdir)


if __name__ == "__main__":
    main()
