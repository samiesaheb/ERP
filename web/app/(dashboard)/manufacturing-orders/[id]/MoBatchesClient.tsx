'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge, { batchStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { ProductionBatch, Item, Uom } from '@/lib/types';

interface Props {
  moId:    string;
  batches: ProductionBatch[];
  uomMap:  Record<string, string>;
  items:   Item[];
  uoms:    Uom[];
}

function fmt(v: string | null | undefined) {
  return v ? new Date(v).toLocaleDateString() : '—';
}

function qty(v: string | null | undefined, uom: string) {
  if (!v) return '—';
  return `${Number(v).toLocaleString()} ${uom}`;
}

export default function MoBatchesClient({ moId, batches, uomMap, items, uoms }: Props) {
  const router = useRouter();
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');

  // Issue logging state
  const [issueOpen, setIssueOpen]     = useState(false);
  const [issueBatch, setIssueBatch]   = useState<ProductionBatch | null>(null);
  const [issueForm, setIssueForm]     = useState({
    item_id:      '',
    qty_issued:   '',
    qty_returned: '',
    qty_loss:     '',
    uom_id:       '',
    lot_number:   '',
  });
  const [issueSaving, setIssueSaving] = useState(false);
  const [issueError, setIssueError]   = useState('');

  async function handleCreate() {
    setCreateError('');
    setCreating(true);
    try {
      await clientFetch(`/api/v1/manufacturing-orders/${moId}/batches`, { method: 'POST' });
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  }

  function openIssue(batch: ProductionBatch) {
    setIssueBatch(batch);
    setIssueForm({ item_id: '', qty_issued: '', qty_returned: '', qty_loss: '', uom_id: '', lot_number: '' });
    setIssueError('');
    setIssueOpen(true);
  }

  async function handleIssueSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!issueBatch) return;
    setIssueError('');
    setIssueSaving(true);
    try {
      await clientFetch(`/api/v1/production/batches/${issueBatch.id}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          item_id:      issueForm.item_id,
          qty_issued:   issueForm.qty_issued,
          qty_returned: issueForm.qty_returned || '0',
          qty_loss:     issueForm.qty_loss     || '0',
          uom_id:       issueForm.uom_id,
          lot_number:   issueForm.lot_number   || null,
        }),
      });
      setIssueOpen(false);
      router.refresh();
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIssueSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Production Batches
          </p>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : '+ Create Batch'}
          </Button>
        </CardHeader>

        {createError && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b-[0.5px] border-red-200">
            {createError}
          </div>
        )}

        <div className="overflow-x-auto">
          {batches.length === 0 ? (
            <CardBody className="text-sm text-neutral-400">
              No batches yet — create a batch to start production.
            </CardBody>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                  {['Batch #', 'Status', 'Bulk Produced', 'Filled', 'Packed', 'Created'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const uom = uomMap[batch.uom_id] ?? '';
                  return (
                    <tr key={batch.id}
                      className="border-b-[0.5px] border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium">{batch.batch_number}</td>
                      <td className="px-4 py-3">
                        <Badge variant={batchStatusVariant(batch.status)}>{batch.status}</Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{qty(batch.qty_bulk_produced, uom)}</td>
                      <td className="px-4 py-3 tabular-nums">{qty(batch.qty_filled, uom)}</td>
                      <td className="px-4 py-3 tabular-nums">{qty(batch.qty_packed, uom)}</td>
                      <td className="px-4 py-3 text-neutral-500">{fmt(batch.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {batch.status !== 'completed' && (
                            <button
                              onClick={() => openIssue(batch)}
                              className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                            >
                              Log Issues
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/production?batch=${batch.id}`)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            View on Floor →
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <SlideOver
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title={`Log Component Issue — ${issueBatch?.batch_number ?? ''}`}
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Component / Material</label>
            <ComboBox
              required
              value={issueForm.item_id}
              onChange={(v) => {
                const item = items.find((i) => i.id === v);
                setIssueForm((f) => ({ ...f, item_id: v, uom_id: item?.uom_id ?? f.uom_id }));
              }}
              options={items.filter((i) => i.item_type !== 'FG').map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
              placeholder="Select material"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Qty Issued</label>
              <input required type="number" min="0" step="any" value={issueForm.qty_issued}
                onChange={(e) => setIssueForm((f) => ({ ...f, qty_issued: e.target.value }))}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
              <ComboBox
                required
                value={issueForm.uom_id}
                onChange={(v) => setIssueForm((f) => ({ ...f, uom_id: v }))}
                options={uoms.map((u) => ({ value: u.id, label: u.code }))}
                placeholder="Select"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Qty Returned</label>
              <input type="number" min="0" step="any" value={issueForm.qty_returned}
                onChange={(e) => setIssueForm((f) => ({ ...f, qty_returned: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Qty Loss</label>
              <input type="number" min="0" step="any" value={issueForm.qty_loss}
                onChange={(e) => setIssueForm((f) => ({ ...f, qty_loss: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Lot Number (optional)</label>
            <input type="text" value={issueForm.lot_number}
              onChange={(e) => setIssueForm((f) => ({ ...f, lot_number: e.target.value }))}
              placeholder="e.g. LOT-2025-001"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>

          {issueError && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {issueError}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={issueSaving} className="flex-1">
              {issueSaving ? 'Saving…' : 'Log Issue'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIssueOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
