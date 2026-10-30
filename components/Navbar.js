'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, BarChart3, Radio } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const isScanner = pathname === '/';
  const isDashboard = pathname === '/dashboard';

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shadow-sm shadow-emerald-500/20">
              ⚡
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>PIRAVI</span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  LIVE
                </span>
              </h1>
              <p className="text-[11px] text-neutral-400 font-medium">Event QR Check-In</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700/60 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Sync Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Mobile Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 safe-area-bottom">
        <div className="max-w-md mx-auto grid grid-cols-2 p-1.5">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-150 active:scale-95 ${
              isScanner
                ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-inner'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <QrCode className="w-6 h-6 mb-1" />
            <span className="text-xs">Scanner</span>
          </Link>

          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-150 active:scale-95 ${
              isDashboard
                ? 'bg-neutral-800 text-emerald-400 font-semibold shadow-inner'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 className="w-6 h-6 mb-1" />
            <span className="text-xs">Dashboard</span>
          </Link>
        </div>
      </nav>
    </>
  );
}

