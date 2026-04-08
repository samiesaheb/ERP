'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { poStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { PurchaseOrder, PurchaseOrderLine, Item, Uom } from '@/lib/types';

const COLUMNS = (supplierMap: Record<string, string>): Column<PurchaseOrder>[] => [
  { key: 'po_number', header: 'PO #', sortable: true },
  { key: 'supplier_id', header: 'Supplier', render: (r) => supplierMap[r.supplier_id] ?? '—' },
  { key: 'status', header: 'Status',
    render: (r) => <Badge variant={poStatusVariant(r.status)}>{r.status}</Badge> },
  { key: 'expected_date', header: 'Expected', render: (r) => r.expected_date ?? '—', sortable: true },
];

interface ReceiptLine {
  po_line_id:   string;
  item_id:      string;
  qty_received: string;
  uom_id:       string;
  lot_number:   string;
}

export default function ReceivingClient({
  openPos,
  supplierMap,
  items,
  uoms,
}: {
  openPos: PurchaseOrder[];
  supplierMap: Record<string, string>;
  items: Item[];
  uoms: Uom[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState('');
  const [poLines, setPoLines] = useState<PurchaseOrderLine[]>([]);
  const [lines, setLines] = useState<ReceiptLine[]>([
    { po_line_id: '', item_id: '', qty_received: '', uom_id: '', lot_number: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLines([{ po_line_id: '', item_id: '', qty_received: '', uom_id: '', lot_number: '' }]);
    setError('');
    setOpen(true);
  }

  function addLine() {
    setLines([...lines, { po_line_id: '', item_id: '', qty_received: '', uom_id: '', lot_number: '' }]);
  }

  function removeLine(idx: number) {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof ReceiptLine, value: string) {
    setLines(lines.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      // Auto-fill item + UOM when a PO line is selected
      if (field === 'po_line_id') {
        const poLine = poLines.find((pl) => pl.id === value);
        if (poLine) {
          updated.item_id = poLine.item_id;
          updated.uom_id  = poLine.uom_id;
        }
      }
      // Also allow manual item override to reset UOM
      if (field === 'item_id') {
        const item = items.find((it) => it.id === value);
        if (item) updated.uom_id = item.uom_id;
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
            lot_number: l.lot_number || null,
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

  return (
    <>
      <div className="flex justify-start mb-3">
        <Button onClick={() => openForPo('')}>+ Record Receipt</Button>
      </div>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(supplierMap)}
          data={openPos}
          actions={(row) => [
            { label: 'Record Receipt', onClick: () => openForPo(row.id) },
            { label: 'View PO', onClick: () => router.push(`/purchase-orders/${row.id}`) },
          ]}
        />
      </div>

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
                  <label className="block text-[11px] text-neutral-500 mb-0.5">Item</label>
                  <select required value={line.item_id}
                    onChange={(e) => updateLine(idx, 'item_id', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded bg-white">
                    <option value="">Select item</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.item_code} — {i.description}</option>
                    ))}
                  </select>
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

                <div>
                  <label className="block text-[11px] text-neutral-500 mb-0.5">Lot number (optional)</label>
                  <input placeholder="e.g. LOT-2025-001" value={line.lot_number}
                    onChange={(e) => updateLine(idx, 'lot_number', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
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
    </>
  );
}
