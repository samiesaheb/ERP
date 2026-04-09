import { getAuditLogs } from '@/lib/api';
import AuditLogsClient from './AuditLogsClient';

export default async function AuditLogsPage() {
  const logs = await getAuditLogs({ limit: 200 });
  return <AuditLogsClient logs={logs} />;
}
