'use client';
import { useState } from 'react';
import { Card, Label, Input, Select, Button } from '@/components/ui';
import { Download, Music2, Video, Info } from 'lucide-react';

export default function Page() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'audio' | 'video'>('video');
  const [quality, setQuality] = useState<'720' | '1080' | 'best'>('720');
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav'>('mp3'); // รูปแบบเสียง
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  async function handleDownload(e: any) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setLog(['เริ่มดาวน์โหลด...']);
    try {
      const body = { url, mode, quality, audioFormat };
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Request failed');
      }
      // ดึงชื่อไฟล์จาก Content-Disposition (จะได้ fallback ASCII เสมอ)
      const disp = res.headers.get('Content-Disposition') || '';
      const match = /filename=\"?([^\"]+)\"?/i.exec(disp);
      const fallback =
        mode === 'audio'
          ? audioFormat === 'wav'
            ? 'audio.wav'
            : 'audio.mp3'
          : 'video.mp4';
      const filename = match?.[1] || fallback;

      const blob = await res.blob();
      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlBlob);
      setLog((l) => [...l, 'ดาวน์โหลดเสร็จแล้ว']);
    } catch (err: any) {
      setLog((l) => [...l, 'ข้อผิดพลาด: ' + (err?.message || 'unknown')]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-brand-700 to-brand-500 text-transparent bg-clip-text">
          ดาวน์โหลดสื่อ AEKAI Studio
        </h1>
        <p className="text-slate-600 mt-2">
          วางลิงก์ที่คุณมีสิทธิ์ดาวน์โหลด เลือกวิดีโอหรือเสียง แล้วกด “ดาวน์โหลด”
        </p>
      </div>

      <Card>
        <form onSubmit={handleDownload} className="grid grid-cols-1 gap-5">
          <div>
            <Label htmlFor="url">ลิงก์</Label>
            <Input
              id="url"
              placeholder="https://..."
              value={url}
              onChange={(e: any) => setUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* โหมด */}
            <div>
              <Label>โหมด</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('video')}
                  className={`flex-1 rounded-xl border px-4 py-2.5 ${
                    mode === 'video'
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-slate-200'
                  }`}
                >
                  <Video className="inline mr-2" /> วิดีโอ
                </button>
                <button
                  type="button"
                  onClick={() => setMode('audio')}
                  className={`flex-1 rounded-xl border px-4 py-2.5 ${
                    mode === 'audio'
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-slate-200'
                  }`}
                >
                  <Music2 className="inline mr-2" /> เสียง
                </button>
              </div>
            </div>

            {/* คุณภาพวิดีโอ */}
            <div>
              <Label>คุณภาพวิดีโอ</Label>
              <Select
                value={quality}
                onChange={(e: any) => setQuality(e.target.value)}
                options={[
                  { value: 'best', label: 'ดีที่สุด' },
                  { value: '1080', label: 'สูงสุด 1080p' },
                  { value: '720', label: 'สูงสุด 720p' },
                ]}
                disabled={mode !== 'video'}
              />
            </div>

            {/* รูปแบบเสียง */}
            <div>
              <Label>รูปแบบเสียง</Label>
              <Select
                value={audioFormat}
                onChange={(e: any) => setAudioFormat(e.target.value)}
                options={[
                  { value: 'mp3', label: 'MP3 (แนะนำ/ไฟล์เล็ก)' },
                  { value: 'wav', label: 'WAV (ไม่บีบอัด/ไฟล์ใหญ่)' },
                ]}
                disabled={mode !== 'audio'}
              />
            </div>

            <div className="md:col-span-3">
              <Button
                type="submit"
                loading={loading}
                className="w-full"
                aria-label="ดาวน์โหลด"
              >
                <Download className="h-4 w-4" /> ดาวน์โหลด
              </Button>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4" />
            <p>
              แอปนี้ใช้ <code>yt-dlp</code> + <code>ffmpeg</code> ทางฝั่งเซิร์ฟเวอร์
              โปรดดาวน์โหลดเฉพาะเนื้อหาที่คุณเป็นเจ้าของหรือได้รับอนุญาต
            </p>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <Card>
          <h3 className="font-semibold mb-2">สถานะการทำงาน</h3>
          <div className="min-h-16 text-sm space-y-1">
            {log.length === 0 ? (
              <p className="text-slate-500">ยังไม่มีรายการ</p>
            ) : (
              log.map((line, i) => <p key={i}>{line}</p>)
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
