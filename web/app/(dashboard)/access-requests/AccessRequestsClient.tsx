'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { AccessRequest } from '@/lib/types';

interface Props {
  requests: AccessRequest[];
  userMap:  Record<string, string>;
}

const STATUS_VARIANT: Record<string, 'amber' | 'green' | 'red'> = {
  pending:  'amber',
  approved: 'green',
  denied:   'red',
};

function makeColumns(
  userMap: Record<string, string>,
  onReview: (r: AccessRequest) => void,
): Column<AccessRequest>[] {
  return [
    { key: 'user_id',    header: 'Requested By', sortable: true,
      render: (r) => userMap[r.user_id] ?? r.user_id.slice(0, 8) },
    { key: 'permission', header: 'Permission',   sortable: true },
    { key: 'reason',     header: 'Reason',
      render: (r) => r.reason ?? '—' },
    { key: 'status',     header: 'Status',       sortable: true,
      render: (r) => <Badge variant={STATUS_VARIANT[r.status] ?? 'blue'}>{r.status}</Badge> },
    { key: 'reviewed_by', header: 'Reviewed By',
      render: (r) => r.reviewed_by ? (userMap[r.reviewed_by] ?? r.reviewed_by.slice(0, 8)) : '—' },
    { key: 'created_at', header: 'Requested',    sortable: true,
      render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: 'id',         header: '',
      render: (r) => r.status === 'pending'
        ? <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onReview(r); }}>Review</Button>
        : null },
  ];
}

export default function AccessRequestsClient({ requests, userMap }: Props) {
  const router   = useRouter();
  const [reviewing, setReviewing] = useState<AccessRequest | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [newOpen,   setNewOpen]   = useState(false);
  const [newForm,   setNewForm]   = useState({ permission: '', reason: '' });
  const [newLoading, setNewLoading] = useState(false);
  const [newError,   setNewError]   = useState('');

  async function handleDecision(status: 'approved' | 'denied') {
    if (!reviewing) return;
    setError('');
    setLoading(true);
    try {
      await clientFetch(`/api/v1/access-requests/${reviewing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setReviewing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewRequest() {
    setNewError('');
    setNewLoading(true);
    try {
      await clientFetch('/api/v1/access-requests', {
        method: 'POST',
        body: JSON.stringify({ permission: newForm.permission, reason: newForm.reason || null }),
      });
      setNewOpen(false);
      setNewForm({ permission: '', reason: '' });
      router.refresh();
    } catch (err) {
      setNewError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setNewLoading(false);
    }
  }

  return (
    <>
      <DataTable
        data={requests}
        columns={makeColumns(userMap, setReviewing)}
        onRowClick={(row) => setReviewing(row)}
        toolbar={
          <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
            + Request Access
          </Button>
        }
      />

      {/* Review slide-over (admin) */}
      <SlideOver open={!!reviewing} onClose={() => setReviewing(null)} title="Review Access Request">
        {reviewing && (
          <div className="space-y-4">
            <div className="bg-neutral-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Requested by</span>
                <span className="font-medium">{userMap[reviewing.user_id] ?? reviewing.user_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Permission</span>
                <span className="font-mono text-xs bg-neutral-200 px-2 py-0.5 rounded">{reviewing.permission}</span>
              </div>
              {reviewing.reason && (
                <div>
                  <span className="text-neutral-500">Reason</span>
                  <p className="mt-1 text-neutral-800">{reviewing.reason}</p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Submitted</span>
                <span>{new Date(reviewing.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => handleDecision('approved')} disabled={loading}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => handleDecision('denied')} disabled={loading}>
                Deny
              </Button>
              <Button variant="secondary" onClick={() => setReviewing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </SlideOver>

      {/* New request slide-over */}
      <SlideOver open={newOpen} onClose={() => setNewOpen(false)} title="Request Access">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Permission / Module *</label>
            <input
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              value={newForm.permission}
              onChange={(e) => setNewForm((f) => ({ ...f, permission: e.target.value }))}
              placeholder="e.g. /invoicing or finance.view"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Reason</label>
            <textarea
              className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              rows={3}
              value={newForm.reason}
              onChange={(e) => setNewForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Why do you need this access?"
            />
          </div>
          {newError && <p className="text-xs text-red-600">{newError}</p>}
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleNewRequest} disabled={newLoading}>
              {newLoading ? 'Submitting…' : 'Submit Request'}
            </Button>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>Cancel</Button>
          </div>
        </div>
      </SlideOver>
    </>
  );
}
