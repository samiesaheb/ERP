'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/client-api';
import type { Company, UserCompanyInfo } from '@/lib/types';

// Normalised shape used internally so we can handle both sources
interface CompanyOption {
  id:         string;
  name:       string;
  code:       string;
  role:       string;
  is_primary: boolean;
}

function getRoleFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    const p = JSON.parse(atob(match[1].split('.')[1]));
    return (p as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export default function CompanySelectPage() {
  const router = useRouter();
  const [options, setOptions]     = useState<CompanyOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError]         = useState('');

  useEffect(() => {
    const role = getRoleFromCookie();
    const isAdmin = role === 'admin';

    if (isAdmin) {
      // Admins see every active company
      clientFetch<Company[]>('/api/v1/companies')
        .then((companies) =>
          setOptions(
            companies
              .filter((c) => c.is_active)
              .map((c) => ({
                id:         c.id,
                name:       c.name,
                code:       c.code,
                role:       'admin',
                is_primary: false,
              }))
          )
        )
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to load companies';
          if (msg === 'Unauthorized') router.replace('/login');
          else setError(msg);
        })
        .finally(() => setLoading(false));
    } else {
      // Non-admins see only their assigned companies
      clientFetch<UserCompanyInfo[]>('/api/v1/users/me/companies')
        .then((rows) =>
          setOptions(
            rows.map((r) => ({
              id:         r.company_id,
              name:       r.company_name,
              code:       r.company_code,
              role:       r.role,
              is_primary: r.is_primary,
            }))
          )
        )
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to load companies';
          if (msg === 'Unauthorized') router.replace('/login');
          else setError(msg);
        })
        .finally(() => setLoading(false));
    }
  }, [router]);

  async function handleSelect(companyId: string) {
    setSelecting(companyId);
    setError('');
    try {
      const res = await fetch('/api/auth/select-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Failed to select company');
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select company');
      setSelecting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <p className="text-sm text-neutral-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Select Company
          </h1>
          <p className="text-sm text-neutral-500 mt-1">Choose the company to work in</p>
        </div>

        <div className="space-y-2">
          {options.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id)}
              disabled={selecting !== null}
              className="w-full text-left bg-white dark:bg-neutral-900
                         border-[0.5px] border-neutral-200 dark:border-neutral-800
                         rounded-lg p-4 hover:border-neutral-400 dark:hover:border-neutral-600
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {c.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {c.code}
                    {' · '}
                    <span className="capitalize">{c.role}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.is_primary && (
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                  {selecting === c.id && (
                    <span className="text-xs text-neutral-400">Loading…</span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {options.length === 0 && !error && (
            <p className="text-center text-sm text-neutral-400 py-6">
              No companies available.
            </p>
          )}
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
