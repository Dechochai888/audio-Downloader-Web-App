import './globals.css';

export const metadata = {
  title: 'ดาวน์โหลด Youtube-Tiktok AEKAI',
  description: 'เว็บดาวน์โหลดวิดีโอและเสียงด้วย yt-dlp + ffmpeg',
  icons: {
    icon: '/AEK.ico',  // ใช้ไฟล์ที่คุณวางใน public/
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
