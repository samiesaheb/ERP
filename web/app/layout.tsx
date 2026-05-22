import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'SkyHigh MES',
  description: 'Manufacturing Execution System — Cosmetics OEM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <head>
        {/* Apply dark class before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(localStorage.getItem('app-dark-mode')==='true')document.documentElement.classList.add('dark')}catch(e){}})()` }} />
      </head>
      <body className="h-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">{children}</body>
    </html>
  );
}
