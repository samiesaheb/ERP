import { getAuditLogs } from '@/lib/api';
import AuditLogsClient from './AuditLogsClient';
import type { AuditLog } from '@/lib/types';

export default async function AuditLogsPage() {
  let logs: AuditLog[];
  try {
    logs = await getAuditLogs({ limit: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold text-neutral-900">Audit Trail</h1>
        <div className="rounded-xl bg-red-50 border-[0.5px] border-red-200 px-4 py-3 text-sm text-red-700">
          {msg}
        </div>
      </div>
    );
  }
  return <AuditLogsClient logs={logs} />;
}
