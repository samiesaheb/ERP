'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

function getEmailFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    const payload = JSON.parse(atob(match[1].split('.')[1]));
    return payload.email ?? null;
  } catch {
    return null;
  }
}

function initials(email: string | null) {
  if (!email) return '?';
  return email[0].toUpperCase();
}

export default function ProfileButton() {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEmail(getEmailFromCookie());
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
        {initials(email)}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 bg-white border-[0.5px] border-neutral-200
                        rounded-xl shadow-lg shadow-neutral-200/60 py-1">
          {/* User info */}
          <div className="px-4 py-3 border-b-[0.5px] border-neutral-100">
            <p className="text-xs font-medium text-neutral-900 truncate">{email ?? 'Signed in'}</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">SkyHigh MES</p>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50
                       transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
