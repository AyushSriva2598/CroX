import { GoogleOAuthProvider } from '@react-oauth/google';
import "./globals.css";

export const metadata = {
  title: "TrustLayer — Smart Escrow Platform",
  description: "UPI-native escrow infrastructure with AI contract analysis and Monad blockchain verification",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'dummy-client-id'}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
