import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import fssync from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ตั้งค่าใน .env.local (แนะนำบน Windows):
 *   YTDLP_PATH=C:\Tools\yt-dlp.exe
 *   FFMPEG_PATH=C:\Tools\ffmpeg-2025-09-10-git-xxxx\bin\ffmpeg.exe
 * ถ้าไม่ตั้ง จะพยายามใช้ชื่อคำสั่งบน PATH ตามปกติ
 */
const YTDLP =
  process.env.YTDLP_PATH ||
  (process.platform === 'win32' ? 'C:\\Tools\\yt-dlp.exe' : 'yt-dlp');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

/** สร้าง Content-Disposition ให้รองรับ UTF-8 (RFC 5987) และผ่านข้อจำกัด ASCII ของ header */
function contentDisposition(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_'); // เฉพาะ ASCII
  const encodedStar = encodeURIComponent(filename)
    .replace(/['()]/g, escape) // ให้เหลือ ASCII ทั้งหมด
    .replace(/\*/g, '%2A');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedStar}`;
}

/** เรียก yt-dlp โดยระบุ ffmpeg ถ้ากำหนดไว้ และบังคับ --restrict-filenames กันชื่อไฟล์ผิดปกติบนดิสก์ */
function runYtDlp(args: string[]) {
  const finalArgs = [
    ...(process.env.FFMPEG_PATH ? ['--ffmpeg-location', FFMPEG] : []),
    '--restrict-filenames',
    ...args,
  ];
  return new Promise<{ code: number }>((resolve, reject) => {
    const proc = spawn(YTDLP, finalArgs, { shell: false });
    proc.stdout.on('data', (d) => console.log('[yt-dlp]', d.toString()));
    proc.stderr.on('data', (d) => console.error('[yt-dlp]', d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => resolve({ code: code ?? 1 }));
  });
}

export async function POST(req: NextRequest) {
  try {
    const { url, mode = 'video', quality = '720', audioFormat = 'mp3' } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response('Invalid URL', { status: 400 });
    }

    const tmpDir = path.join(process.cwd(), '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });

    // prefix สำหรับหาไฟล์ที่เพิ่งโหลดเสร็จ
    const ts = Date.now().toString();
    const outPattern = path.join(tmpDir, `${ts}_.%(title).200B.%(ext)s`);

    // build args ตามโหมด
    let args: string[] = [];
    if (mode === 'audio') {
      // เลือก mp3 / wav ได้ที่นี่
      const fmt = audioFormat === 'wav' ? 'wav' : 'mp3';
      args = [
        '-f', 'bestaudio/best',
        '--extract-audio', '--audio-format', fmt,
        ...(fmt === 'mp3' ? ['--audio-quality', '0'] : []), // คุณภาพใช้กับ mp3; wav ไม่บีบอัด
        '--embed-metadata',
        ...(fmt === 'mp3' ? ['--embed-thumbnail'] : []), // WAV ปกติไม่ฝัง thumbnail
        '-o', outPattern,
        url,
      ];
    } else {
      let format = 'bestvideo*+bestaudio/best';
      if (quality === '720') format = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
      else if (quality === '1080') format = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
      args = [
        '-f', format,
        '--merge-output-format', 'mp4',
        '--embed-metadata',
        '-o', outPattern,
        url,
      ];
    }

    const { code } = await runYtDlp(args);
    if (code !== 0) {
      return new Response('yt-dlp failed. Ensure yt-dlp and ffmpeg are installed and URL is supported.', { status: 500 });
    }

    // หาไฟล์ออกล่าสุดที่มี prefix ts_
    const files = await fs.readdir(tmpDir);
    const prefix = `${ts}_`;
    const candidates = files
      .filter((f) => f.startsWith(prefix))
      .map((f) => path.join(tmpDir, f));

    if (candidates.length === 0) {
      return new Response('Output file not found', { status: 500 });
    }

    const stats = await Promise.all(
      candidates.map(async (p) => ({ p, t: (await fs.stat(p)).mtimeMs }))
    );
    stats.sort((a, b) => b.t - a.t);
    const filePath = stats[0].p;

    const filename = sanitizeFilename(path.basename(filePath));
    const ext = path.extname(filename).toLowerCase();

    // Content-Type แบบง่าย
    const isAudio = ['.mp3', '.m4a', '.opus', '.ogg', '.wav'].includes(ext);
    const contentType = isAudio
      ? (ext === '.mp3' ? 'audio/mpeg'
        : ext === '.m4a' ? 'audio/mp4'
        : ext === '.wav' ? 'audio/wav'
        : ext === '.opus' ? 'audio/ogg' // ส่วนใหญ่รองรับผ่าน audio/ogg + codecs=opus
        : 'audio/mpeg')
      : (ext === '.webm' ? 'video/webm' : 'video/mp4');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', contentDisposition(filename));
    headers.set('Cache-Control', 'no-store');

    const stream = fssync.createReadStream(filePath);
    stream.on('close', async () => {
      try { await fs.unlink(filePath); } catch {}
    });

    return new Response(stream as any, { status: 200, headers });
  } catch (err: any) {
    console.error(err);
    return new Response(err?.message || 'Internal Error', { status: 500 });
  }
}
