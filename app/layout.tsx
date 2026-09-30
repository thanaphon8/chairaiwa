import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

// ฟอนต์หลักของแอป: ไทย + ตัวเลขละติน ในตระกูลเดียวกัน
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chai Rai Wa | จ่ายไรวะ",
  description: "บันทึกรายรับ-รายจ่ายง่ายๆ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5C38C9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${plexThai.className} antialiased`}>{children}</body>
    </html>
  );
}