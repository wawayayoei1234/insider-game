import "./globals.css";

export const metadata = {
  title: "Insider Party 🕵️‍♂️ - เล่นเกมทายคำออนไลน์ฟรีกับเพื่อน",
  description: "เกมทายคำออนไลน์สุดกวนและสนุกสนาน ร่วมมือกันตามหาตัวอินไซเดอร์ท่ามกลางพวกเรา! เล่นฟรีได้ทันทีบนมือถือและพีซี",
  manifest: "/manifest.json",
  icons: {
    icon: "/game_logo.png",
    apple: "/game_logo.png",
  },
  keywords: [
    "insider game",
    "เกมอินไซเดอร์",
    "party game",
    "เกมทายคำ",
    "เกมออนไลน์หลายคน",
    "อนิเมะบอร์ดเกม"
  ],
  openGraph: {
    title: "Insider Party - เล่นฟรีคิ้วท์ ๆ กับเพื่อนได้เลย!",
    description: "บอร์ดเกมทายคำยอดฮิตในสไตล์วิชวลโนเวลญี่ปุ่น เล่นง่ายบนทุกหน้าจอผ่าน WebSocket",
    url: "https://insider-game.org",
    siteName: "Insider Party",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
