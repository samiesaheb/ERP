'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { poStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { PurchaseOrder, PurchaseOrderLine, Receipt, ReceiptLine, Item, Uom } from '@/lib/types';

const COLUMNS = (supplierMap: Record<string, string>): Column<PurchaseOrder>[] => [
  { key: 'po_number', header: 'PO #', sortable: true },
  { key: 'supplier_id', header: 'Supplier', render: (r) => supplierMap[r.supplier_id] ?? '—' },
  { key: 'status', header: 'Status',
    render: (r) => <Badge variant={poStatusVariant(r.status)}>{r.status}</Badge> },
  { key: 'expected_date', header: 'Expected', render: (r) => r.expected_date ?? '—', sortable: true },
];

interface ReceiptLineForm {
  po_line_id:   string;
  item_id:      string;
  qty_received: string;
  uom_id:       string;
  lot_number:   string;
  expiry_date:  string;
}

function qcVariant(status: string): 'gray' | 'green' | 'red' {
  if (status === 'passed') return 'green';
  if (status === 'failed') return 'red';
  return 'gray';
}

const RECEIPT_COLUMNS = (poMap: Record<string, string>): Column<Receipt>[] => [
  { key: 'receipt_number',    header: 'GRN #',      sortable: true },
  { key: 'purchase_order_id', header: 'PO',          render: (r) => poMap[r.purchase_order_id] ?? '—' },
  { key: 'received_by',       header: 'Received By', render: (r) => r.received_by ?? '—' },
  { key: 'notes',             header: 'Notes',       render: (r) => r.notes ?? '—' },
  { key: 'received_at',       header: 'Date',        sortable: true,
    render: (r) => new Date(r.received_at).toLocaleDateString() },
];

export default function ReceivingClient({
  openPos,
  receipts,
  supplierMap,
  poMap,
  items,
  uoms,
}: {
  openPos:     PurchaseOrder[];
  receipts:    Receipt[];
  supplierMap: Record<string, string>;
  poMap:       Record<string, string>;
  items:       Item[];
  uoms:        Uom[];
}) {
  const router = useRouter();
  const [tab, setTab]   = useState<'open' | 'history'>('open');

  // GRN form
  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState('');
  const [poLines, setPoLines] = useState<PurchaseOrderLine[]>([]);
  const [lines, setLines] = useState<ReceiptLineForm[]>([
    { po_line_id: '', item_id: '', qty_received: '', uom_id: '', lot_number: '', expiry_date: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // QC review panel
  const [qcReceipt, setQcReceipt] = useState<Receipt | null>(null);
  const [qcLines, setQcLines] = useState<ReceiptLine[]>([]);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcUpdating, setQcUpdating] = useState<string | null>(null);

  // Fetch PO lines whenever the selected PO changes
  useEffect(() => {
    if (!poId) { setPoLines([]); return; }
    clientFetch<PurchaseOrderLine[]>(`/api/v1/purchase-orders/${poId}/lines`)
      .then(setPoLines)
      .catch(() => setPoLines([]));
  }, [poId]);

  function openForPo(id: string) {
    setPoId(id);
    setPoLines([]);
    setLines([{ po_line_id: '', item_id: '', qty_received: '', uom_id: '', lot_number: '', expiry_date: '' }]);
    setError('');
    setOpen(true);
  }

  function addLine() {
    setLines([...lines, { po_line_id: '', item_id: '', qty_received: '', uom_id: '', lot_number: '', expiry_date: '' }]);
  }

  function removeLine(idx: number) {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof ReceiptLineForm, value: string) {
    setLines(lines.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === 'po_line_id') {
        const poLine = poLines.find((pl) => pl.id === value);
        if (poLine) {
          updated.item_id = poLine.item_id;
          updated.uom_id  = poLine.uom_id;
        }
      }
      return updated;
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/receipts', {
        method: 'POST',
        body: JSON.stringify({
          purchase_order_id: poId,
          lines: lines.map((l) => ({
            ...l,
            lot_number:  l.lot_number  || null,
            expiry_date: l.expiry_date || null,
          })),
        }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function openQcPanel(receipt: Receipt) {
    setQcReceipt(receipt);
    setQcLines([]);
    setQcLoading(true);
    try {
      const data = await clientFetch<ReceiptLine[]>(`/api/v1/receipts/${receipt.id}/lines`);
      setQcLines(data);
    } catch {
      setQcLines([]);
    } finally {
      setQcLoading(false);
    }
  }

  async function updateQcStatus(lineId: string, qcStatus: string) {
    if (!qcReceipt) return;
    setQcUpdating(lineId);
    try {
      const updated = await clientFetch<ReceiptLine>(
        `/api/v1/receipts/${qcReceipt.id}/lines/${lineId}`,
        { method: 'PUT', body: JSON.stringify({ qc_status: qcStatus }) }
      );
      setQcLines((prev) => prev.map((l) => l.id === lineId ? updated : l));
    } catch {
      // silent — keep existing state
    } finally {
      setQcUpdating(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          {([['open', 'Open POs'], ['history', 'Receipt History']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => openForPo('')}>+ Record Receipt</Button>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        {tab === 'open' ? (
          <DataTable
            columns={COLUMNS(supplierMap)}
            data={openPos}
            actions={(row) => [
              { label: 'Record Receipt', onClick: () => openForPo(row.id) },
              { label: 'View PO',        onClick: () => router.push(`/purchase-orders/${row.id}`) },
            ]}
          />
        ) : (
          <DataTable
            columns={RECEIPT_COLUMNS(poMap)}
            data={receipts}
            actions={(row) => [
              { label: 'QC Review', onClick: () => openQcPanel(row) },
              { label: 'View PO',   onClick: () => router.push(`/purchase-orders/${row.purchase_order_id}`) },
            ]}
          />
        )}
      </div>

      {/* GRN slide-over */}
      <SlideOver open={open} onClose={() => setOpen(false)} title="Record Goods Receipt">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Purchase Order</label>
            <select required value={poId} onChange={(e) => setPoId(e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select PO</option>
              {openPos.map((po) => <option key={po.id} value={po.id}>{po.po_number}</option>)}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-neutral-600">Lines received</label>
              <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline">+ Add line</button>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="space-y-1.5 p-3 border-[0.5px] border-neutral-200 rounded mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-neutral-500">Line {idx + 1}</span>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)} className="text-xs text-red-500 hover:underline">Remove</button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-500 mb-0.5">PO Line</label>
                  <select required value={line.po_line_id}
                    onChange={(e) => updateLine(idx, 'po_line_id', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded bg-white">
                    <option value="">{poId ? (poLines.length === 0 ? 'Loading…' : 'Select line') : 'Select a PO first'}</option>
                    {poLines.map((pl) => {
                      const itemLabel = items.find((it) => it.id === pl.item_id);
                      const remaining = Number(pl.qty_ordered) - Number(pl.qty_received);
                      return (
                        <option key={pl.id} value={pl.id}>
                          {itemLabel ? `${itemLabel.item_code} — ${itemLabel.description}` : pl.item_id}
                          {' '}(ordered {Number(pl.qty_ordered).toLocaleString()}, remaining {remaining.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                  {line.item_id && (
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      Item: {items.find((i) => i.id === line.item_id)?.item_code ?? line.item_id}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-0.5">Qty received</label>
                    <input required placeholder="0" type="number" min="0.0001" step="any" value={line.qty_received}
                      onChange={(e) => updateLine(idx, 'qty_received', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-0.5">UOM</label>
                    <select required value={line.uom_id}
                      onChange={(e) => updateLine(idx, 'uom_id', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded bg-white">
                      <option value="">UOM</option>
                      {uoms.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-0.5">Lot number (optional)</label>
                    <input placeholder="e.g. LOT-2025-001" value={line.lot_number}
                      onChange={(e) => updateLine(idx, 'lot_number', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-500 mb-0.5">Expiry date (optional)</label>
                    <input type="date" value={line.expiry_date}
                      onChange={(e) => updateLine(idx, 'expiry_date', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Saving…' : 'Save Receipt'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>

      {/* QC Review slide-over */}
      <SlideOver open={!!qcReceipt} onClose={() => setQcReceipt(null)}
        title={`QC Review — ${qcReceipt?.receipt_number ?? ''}`}>
        <div className="space-y-3">
          {qcLoading ? (
            <p className="text-sm text-neutral-400">Loading lines…</p>
          ) : qcLines.length === 0 ? (
            <p className="text-sm text-neutral-400">No lines found</p>
          ) : (
            qcLines.map((line) => {
              const item = items.find((i) => i.id === line.item_id);
              const uom  = uoms.find((u) => u.id === line.uom_id);
              const isUpdating = qcUpdating === line.id;
              return (
                <div key={line.id} className="p-3 border-[0.5px] border-neutral-200 rounded space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-neutral-800">
                        {item ? `${item.item_code} — ${item.description}` : line.item_id}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        Qty: {Number(line.qty_received).toLocaleString()} {uom?.code ?? ''}
                        {line.lot_number && ` · Lot: ${line.lot_number}`}
                        {line.expiry_date && ` · Exp: ${line.expiry_date}`}
                      </p>
                    </div>
                    <Badge variant={qcVariant(line.qc_status)}>{line.qc_status}</Badge>
                  </div>
                  {line.qc_status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        disabled={isUpdating}
                        onClick={() => updateQcStatus(line.id, 'passed')}
                        className="flex-1 py-1.5 text-xs font-medium rounded border-[0.5px] border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors">
                        {isUpdating ? '…' : '✓ Pass'}
                      </button>
                      <button
                        disabled={isUpdating}
                        onClick={() => updateQcStatus(line.id, 'failed')}
                        className="flex-1 py-1.5 text-xs font-medium rounded border-[0.5px] border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors">
                        {isUpdating ? '…' : '✗ Fail'}
                      </button>
                    </div>
                  )}
                  {line.qc_status !== 'pending' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => updateQcStatus(line.id, 'pending')}
                      className="text-[10px] text-neutral-400 hover:text-neutral-600 disabled:opacity-50">
                      Reset to pending
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SlideOver>
    </>
  );
}
