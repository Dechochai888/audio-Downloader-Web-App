import '../app/globals.css'; // หรือ './globals.css' ถ้าคุณย้ายไฟล์ไว้ใน app/
import type { ReactNode } from 'react';

export const metadata = {
  title: 'โปรแกรมดาวน์โหลดสื่อ',
  description: 'ดาวน์โหลดวิดีโอหรือไฟล์เสียงจากลิงก์ที่คุณมีสิทธิ์ใช้งาน',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen text-slate-800">
        {children}
      </body>
    </html>
  );
}
