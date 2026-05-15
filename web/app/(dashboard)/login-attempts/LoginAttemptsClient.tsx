'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import type { LoginAttempt } from '@/lib/types';

const FAILURE_LABEL: Record<string, string> = {
  invalid_credentials: 'Wrong password',
  access_day:          'Blocked day',
  access_window:       'Blocked time',
};

function IpCell({ ip }: { ip: string | null }) {
  if (!ip) return <span className="text-neutral-300">—</span>;
  return <span className="font-mono text-xs">{ip}</span>;
}

function UaCell({ ua }: { ua: string | null }) {
  if (!ua) return <span className="text-neutral-300">—</span>;
  const short = ua.length > 60 ? ua.slice(0, 60) + '…' : ua;
  return <span className="text-neutral-500 text-xs" title={ua}>{short}</span>;
}

export default function LoginAttemptsClient({ attempts }: { attempts: LoginAttempt[] }) {
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [search, setSearch] = useState('');

  const visible = attempts.filter((a) => {
    if (filter === 'success' && !a.success) return false;
    if (filter === 'failed'  &&  a.success) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.email.toLowerCase().includes(q) ||
        (a.user_name ?? '').toLowerCase().includes(q) ||
        (a.ip_address ?? '').includes(q)
      );
    }
    return true;
  });

  const total    = attempts.length;
  const successes = attempts.filter((a) => a.success).length;
  const failures  = total - successes;

  return (
    <div className="space-y-4">

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Total</p>
          <p className="text-3xl font-bold text-neutral-900 mt-2 tabular-nums">{total}</p>
        </div>
        <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl px-5 py-4 border-t-[3px] border-t-green-500">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Successful</p>
          <p className="text-3xl font-bold text-green-600 mt-2 tabular-nums">{successes}</p>
        </div>
        <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl px-5 py-4 border-t-[3px] border-t-red-500">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Failed</p>
          <p className="text-3xl font-bold text-red-500 mt-2 tabular-nums">{failures}</p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b-[0.5px] border-neutral-200">
          {/* Filter tabs */}
          <div className="flex gap-0.5 bg-neutral-100 rounded-lg p-0.5">
            {(['all', 'success', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                  filter === f
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, user, IP…"
            className="w-full max-w-xs px-3 py-1.5 text-sm border border-neutral-300 rounded bg-white placeholder-neutral-400 outline-none focus:border-neutral-500"
          />
          <span className="ml-auto text-xs text-neutral-400 shrink-0">{visible.length} records</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-400 whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Email</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-400">User</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Result</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Reason</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-400">IP Address</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-400">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-neutral-400">
                    No records found
                  </td>
                </tr>
              )}
              {visible.map((a) => (
                <tr key={a.id} className="border-b-[0.5px] border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap tabular-nums">
                    {new Date(a.attempted_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-medium text-neutral-800">{a.email}</td>
                  <td className="px-4 py-3 text-xs text-neutral-600">{a.user_name ?? <span className="text-neutral-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <Badge variant={a.success ? 'green' : 'red'}>
                      {a.success ? 'Success' : 'Failed'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {a.failure_reason ? FAILURE_LABEL[a.failure_reason] ?? a.failure_reason : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><IpCell ip={a.ip_address} /></td>
                  <td className="px-4 py-3 max-w-[260px]"><UaCell ua={a.user_agent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
