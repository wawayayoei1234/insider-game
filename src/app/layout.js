import Script from "next/script";
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
  alternates: {
    canonical: "https://insider-game.org",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Insider Party 🕵️‍♂️ - เล่นเกมทายคำออนไลน์ฟรีกับเพื่อน",
    description: "บอร์ดเกมทายคำยอดฮิตในสไตล์วิชวลโนเวลญี่ปุ่น เล่นง่ายบนทุกหน้าจอผ่าน WebSocket",
    url: "https://insider-game.org",
    siteName: "Insider Party",
    images: [
      {
        url: "https://insider-game.org/detective_bg.png",
        width: 1200,
        height: 630,
        alt: "Insider Party Banner",
      }
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Insider Party 🕵️‍♂️ - เล่นเกมทายคำออนไลน์ฟรีกับเพื่อน",
    description: "บอร์ดเกมทายคำยอดฮิตในสไตล์วิชวลโนเวลญี่ปุ่น เล่นง่ายบนทุกหน้าจอผ่าน WebSocket",
    images: ["https://insider-game.org/game_logo.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Insider Party",
  "operatingSystem": "All",
  "applicationCategory": "GameApplication",
  "browserRequirements": "Requires JavaScript. Requires HTML5.",
  "genre": "Party Game, Word Game, Social Deduction Game",
  "description": "เกมทายคำออนไลน์สุดกวนและสนุกสนาน ร่วมมือกันตามหาตัวอินไซเดอร์ท่ามกลางพวกเรา! เล่นฟรีได้ทันทีบนมือถือและพีซี",
  "url": "https://insider-game.org",
  "screenshot": "https://insider-game.org/detective_bg.png",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "xal2lfwoal");
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
