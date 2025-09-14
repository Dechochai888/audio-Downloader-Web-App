# Media Downloader (Next.js)

A simple, elegant webapp to download **video** or **audio** from a link you have the rights to download, using **yt-dlp** and **ffmpeg** on the server.

> ⚠️ Legal & ethical reminder: Only download media that you own or have explicit permission to download. Respect website Terms of Service and local laws.

## Features
- Paste any supported URL (per yt-dlp); pick **Video** or **Audio**
- Quality presets: Best, up to 1080p, up to 720p
- Clean UI/UX with Tailwind
- Server streams a finished file back for immediate browser download

## Prerequisites
- Node 18+
- **yt-dlp** and **ffmpeg** installed and available on PATH

### Windows quick setup
1. Get `yt-dlp.exe` and add its folder to PATH.
2. Install `ffmpeg` (static build) and add its `bin` to PATH.
3. New terminal: verify `yt-dlp --version`, `ffmpeg -version`.

## Local run
```bash
npm i
npm run dev
# open http://localhost:3000
```

## Notes
- Route Handler uses Node runtime. Avoid Edge/serverless for long downloads.
- Temp files live in `.tmp/` and are auto-deleted after sending.
- Consider adding domain allowlist validation before downloading.
