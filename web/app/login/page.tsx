'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function OAuthErrorReader({ onError }: { onError: (msg: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      onError('Google sign-in failed — please try again.');
    }
  }, [searchParams, onError]);
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@skyhigh.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Login failed');
        return;
      }
      const data = await res.json();
      const companies: { company_id: string }[] = data.companies ?? [];

      if (companies.length === 0) {
        router.push('/');
        router.refresh();
      } else if (companies.length === 1) {
        await fetch('/api/auth/select-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companies[0].company_id }),
        });
        router.push('/');
        router.refresh();
      } else {
        router.push('/company-select');
      }
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
      <Suspense>
        <OAuthErrorReader onError={setError} />
      </Suspense>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">SkyHigh MES</h1>
          <p className="text-sm text-neutral-500 mt-1">Manufacturing Execution System</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-neutral-900 border-[0.5px] border-neutral-200 dark:border-neutral-800 rounded-lg p-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded-md
                         bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                         focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 dark:border-neutral-700 rounded-md
                         bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                         focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 text-sm font-medium text-white bg-neutral-900
                       rounded-md hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="relative flex items-center gap-3 pt-1">
            <div className="flex-1 border-t border-neutral-200" />
            <span className="text-xs text-neutral-400">or</span>
            <div className="flex-1 border-t border-neutral-200" />
          </div>

          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-sm
                       font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800
                       border border-neutral-300 dark:border-neutral-700
                       rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Sign in with Google
          </a>
        </form>
      </div>
    </div>
  );
}
