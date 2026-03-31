'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { poStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { PurchaseOrder } from '@/lib/types';

const COLUMNS = (supplierMap: Record<string, string>): Column<PurchaseOrder>[] => [
  { key: 'po_number', header: 'PO #', sortable: true },
  { key: 'supplier_id', header: 'Supplier', render: (r) => supplierMap[r.supplier_id] ?? '—' },
  { key: 'status', header: 'Status',
    render: (r) => <Badge variant={poStatusVariant(r.status)}>{r.status}</Badge> },
  { key: 'expected_date', header: 'Expected', sortable: true },
  { key: 'total_amount', header: 'Amount', render: (r) => `$${Number(r.total_amount).toLocaleString()}`, className: 'tabular-nums' },
];

interface GrnLine {
  po_line_id: string;
  item_id: string;
  qty_received: string;
  batch_number: string;
  into_stock: boolean;
}

export default function ReceivingClient({
  openPos,
  supplierMap,
}: {
  openPos: PurchaseOrder[];
  supplierMap: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<GrnLine[]>([
    { po_line_id: '', item_id: '', qty_received: '', batch_number: '', into_stock: true },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addLine() {
    setLines([...lines, { po_line_id: '', item_id: '', qty_received: '', batch_number: '', into_stock: true }]);
  }

  function updateLine(idx: number, field: keyof GrnLine, value: string | boolean) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/grn', {
        method: 'POST',
        body: JSON.stringify({ po_id: poId, received_date: receivedDate, lines }),
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
      <div className="flex justify-end mb-3">
        <Button onClick={() => setOpen(true)}>+ Record GRN</Button>
      </div>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
        <DataTable columns={COLUMNS(supplierMap)} data={openPos} />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="Record Goods Receipt">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">PO ID</label>
            <input required placeholder="Purchase Order UUID" value={poId}
              onChange={(e) => setPoId(e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Received Date</label>
            <input required type="date" value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-medium text-neutral-600">Lines</label>
              <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline">+ Add</button>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="space-y-1.5 p-2 border-[0.5px] border-neutral-200 rounded mb-2">
                <input required placeholder="PO Line UUID" value={line.po_line_id}
                  onChange={(e) => updateLine(idx, 'po_line_id', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                <input required placeholder="Item UUID" value={line.item_id}
                  onChange={(e) => updateLine(idx, 'item_id', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                <div className="grid grid-cols-2 gap-1.5">
                  <input required placeholder="Qty received" type="number" value={line.qty_received}
                    onChange={(e) => updateLine(idx, 'qty_received', e.target.value)}
                    className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                  <input required placeholder="Batch #" value={line.batch_number}
                    onChange={(e) => updateLine(idx, 'batch_number', e.target.value)}
                    className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <input type="checkbox" checked={line.into_stock}
                    onChange={(e) => updateLine(idx, 'into_stock', e.target.checked)} />
                  Move into stock immediately
                </label>
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Saving…' : 'Save GRN'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
