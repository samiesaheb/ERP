'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface JwtPayload {
  email?:        string;
  full_name?:    string;
  role?:         string;
  company_id?:   string;
  company_name?: string;
  company_code?: string;
}

function getPayloadFromCookie(): JwtPayload | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(atob(match[1].split('.')[1])) as JwtPayload;
  } catch {
    return null;
  }
}

function initials(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0].toUpperCase();
}

export default function ProfileButton() {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [payload, setPayload] = useState<JwtPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPayload(getPayloadFromCookie());
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSignOut() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-semibold
                   flex items-center justify-center hover:bg-neutral-700 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-1"
        aria-label="Profile menu"
      >
        {initials(payload?.full_name ?? payload?.email)}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 bg-white dark:bg-neutral-900 border-[0.5px] border-neutral-200 dark:border-neutral-800
                        rounded-xl shadow-lg shadow-neutral-200/60 dark:shadow-neutral-900/60 py-1">
          {/* User info */}
          <div className="px-4 py-3 border-b-[0.5px] border-neutral-100 dark:border-neutral-800">
            <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">{payload?.full_name ?? payload?.email ?? 'Signed in'}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5 capitalize">{payload?.role ?? 'SkyHigh MES'}</p>
            {payload?.company_name && (
              <p className="text-[11px] text-blue-500 mt-0.5 truncate">{payload.company_name}</p>
            )}
          </div>

          {/* Switch company */}
          <button
            onClick={() => { setOpen(false); router.push('/company-select'); }}
            className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300
                       hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Switch Company
          </button>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30
                       transition-colors disabled:opacity-50 border-t-[0.5px] border-neutral-100 dark:border-neutral-800"
          >
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
