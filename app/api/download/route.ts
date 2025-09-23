import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import fssync from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const YTDLP =
  process.env.YTDLP_PATH ||
  (process.platform === 'win32' ? 'C:\\Tools\\yt-dlp.exe' : 'yt-dlp');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}
function contentDisposition(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_');
  const encodedStar = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedStar}`;
}

function runYtDlp(args: string[]) {
  const base = [
    ...(process.env.FFMPEG_PATH ? ['--ffmpeg-location', FFMPEG] : []),
    '--restrict-filenames',
    '--geo-bypass',
    '--no-check-certificate',
    '--no-playlist',
    '--force-ipv4',
    '--sleep-requests', '1',
    '--user-agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '--extractor-args', 'youtube:player_client=android',
  ];
  const finalArgs = [...base, ...args];
  return new Promise<{ code: number }>((resolve, reject) => {
    const proc = spawn(YTDLP, finalArgs, { shell: false });
    proc.stdout.on('data', (d) => console.log('[yt-dlp]', d.toString()));
    proc.stderr.on('data', (d) => console.error('[yt-dlp]', d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => resolve({ code: code ?? 1 }));
  });
}

export async function POST(req: NextRequest) {
  let envCookiesPath: string | null = null;
  let filePath: string | null = null;

  try {
    const { url, mode = 'video', quality = '720', audioFormat = 'mp3' } = await req.json();
    if (!url || typeof url !== 'string') return new Response('Invalid URL', { status: 400 });

    const tmpDir = path.join(process.cwd(), '.tmp');
    await fs.mkdir(tmpDir, { recursive: true });

    // อ่าน cookies จาก ENV (ถ้าเปิดใช้งาน)
    const useEnvCookies = String(process.env.USE_ENV_COOKIES || '').toLowerCase() === 'true';
    const envCookiesTxt = process.env.YT_COOKIES_TXT || '';
    if (useEnvCookies && envCookiesTxt.trim().length > 0) {
      // เขียนเป็นไฟล์ชั่วคราวเพื่อส่งให้ yt-dlp
      envCookiesPath = path.join(tmpDir, `cookies_env_${Date.now()}.txt`);
      // ป้องกันค่าแปลก ๆ เกินเหตุ (เช่น >1MB)
      if (envCookiesTxt.length > 1_000_000) {
        return new Response('Cookies ENV is too large', { status: 400 });
      }
      await fs.writeFile(envCookiesPath, envCookiesTxt, { encoding: 'utf8' });
    }

    const ts = Date.now().toString();
    const outPattern = path.join(tmpDir, `${ts}_.%(title).200B.%(ext)s`);

    let args: string[] = [];
    if (mode === 'audio') {
      const fmt = audioFormat === 'wav' ? 'wav' : 'mp3';
      args = [
        ...(envCookiesPath ? ['--cookies', envCookiesPath] : []),
        '-f', 'bestaudio/best',
        '--extract-audio', '--audio-format', fmt,
        ...(fmt === 'mp3' ? ['--audio-quality', '0', '--embed-thumbnail'] : []),
        '--embed-metadata',
        '-o', outPattern,
        url,
      ];
    } else {
      let format = 'bestvideo*+bestaudio/best';
      if (quality === '720') format = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
      else if (quality === '1080') format = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
      args = [
        ...(envCookiesPath ? ['--cookies', envCookiesPath] : []),
        '-f', format,
        '--merge-output-format', 'mp4',
        '--embed-metadata',
        '-o', outPattern,
        url,
      ];
    }

    const { code } = await runYtDlp(args);

    // ลบไฟล์คุกกี้ชั่วคราวทันทีหลังใช้งาน
    if (envCookiesPath) { try { await fs.unlink(envCookiesPath); } catch {} }

    if (code !== 0) {
      const msgWhenRestricted = useEnvCookies
        ? 'ดาวน์โหลดไม่ได้: คุกกี้จาก ENV อาจหมดอายุ/ไม่พอสิทธิ์ หรือคลิปถูกจำกัดเพิ่มเติม'
        : 'ดาวน์โหลดไม่ได้: คลิปนี้อาจถูกจำกัด (ต้องยืนยันตัวตน/จำกัดอายุ/ล็อกอิน). โหมดนี้รองรับเฉพาะลิงก์สาธารณะ';
      return new Response(msgWhenRestricted, { status: 500 });
    }

    const files = await fs.readdir(tmpDir);
    const prefix = `${ts}_`;
    const candidates = files.filter(f => f.startsWith(prefix)).map(f => path.join(tmpDir, f));
    if (candidates.length === 0) return new Response('Output file not found', { status: 500 });

    const stats = await Promise.all(candidates.map(async p => ({ p, t: (await fs.stat(p)).mtimeMs })));
    stats.sort((a, b) => b.t - a.t);
    filePath = stats[0].p;

    const filename = sanitizeFilename(path.basename(filePath));
    const ext = path.extname(filename).toLowerCase();
    const isAudio = ['.mp3', '.m4a', '.opus', '.ogg', '.wav'].includes(ext);
    const contentType = isAudio
      ? (ext === '.mp3' ? 'audio/mpeg'
        : ext === '.m4a' ? 'audio/mp4'
        : ext === '.wav' ? 'audio/wav'
        : ext === '.opus' ? 'audio/ogg'
        : 'audio/mpeg')
      : (ext === '.webm' ? 'video/webm' : 'video/mp4');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', contentDisposition(filename));
    headers.set('Cache-Control', 'no-store');

    const stream = fssync.createReadStream(filePath);
    stream.on('close', async () => { try { await fs.unlink(filePath!); } catch {} });

    return new Response(stream as any, { status: 200, headers });
  } catch (err: any) {
    console.error(err);
    return new Response(err?.message || 'Internal Error', { status: 500 });
  }
}
