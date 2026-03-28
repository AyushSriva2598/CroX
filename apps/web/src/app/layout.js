import Providers from '@/components/Providers';
import "./globals.css";

export const metadata = {
  title: "CroX — Secure Digital Mandate Platform",
  description: "AI-verified escrow infrastructure with Monad blockchain settlement",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
