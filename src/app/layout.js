import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Insider Game",
  description:"เกมทายคำสุดมันส์ ผู้เล่นต้องหาตัวอินไซเดอร์ในหมู่เพื่อน เกมออนไลน์ฟรี เล่นง่ายบนมือถือ",
  manifest: "/manifest.json",
  keywords: [
    "insider game",
    "เกมอินไซเดอร์",
    "party game",
    "เกมทายคำ",
    "เกมออนไลน์หลายคน",
  ],
  openGraph: {
    title: "Insider Game - เล่นฟรีกับเพื่อนได้ทันที",
    description:
      "เกมทายคำแบบออนไลน์ รองรับ WebSocket เล่นได้หลายคนบนมือถือ",
    url: "https://insider-game.org",
    siteName: "Insider Game",
  },
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/favicon-32x32.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
