import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Piravi Admin | QR Check-In',
  description: 'Mobile-first college event QR check-in portal with real-time sync',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Piravi Admin',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col antialiased selection:bg-emerald-500/30">
        <Navbar />
        <main className="flex-1 w-full max-w-lg mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}

