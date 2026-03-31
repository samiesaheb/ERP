'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { poStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { PurchaseOrder, Supplier } from '@/lib/types';

const COLUMNS = (supplierMap: Record<string, string>): Column<PurchaseOrder>[] => [
  { key: 'po_number', header: 'PO #', sortable: true },
  { key: 'supplier_id', header: 'Supplier', render: (r) => supplierMap[r.supplier_id] ?? '—' },
  { key: 'status', header: 'Status',
    render: (r) => <Badge variant={poStatusVariant(r.status)}>{r.status}</Badge>, sortable: true },
  { key: 'supplier_type', header: 'Type',
    render: (r) => <Badge variant={r.supplier_type === 'international' ? 'blue' : 'green'}>{r.supplier_type}</Badge> },
  { key: 'total_amount', header: 'Amount',
    render: (r) => `$${Number(r.total_amount).toLocaleString()}`, sortable: true, className: 'tabular-nums' },
  { key: 'expected_date', header: 'Expected', render: (r) => r.expected_date, sortable: true },
];

interface NewPoLine {
  item_id: string;
  qty_ordered: string;
  unit_price: string;
  uom_id: string;
}

export default function PurchaseOrdersClient({
  orders,
  supplierMap,
  suppliers,
}: {
  orders: PurchaseOrder[];
  supplierMap: Record<string, string>;
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState<NewPoLine[]>([
    { item_id: '', qty_ordered: '', unit_price: '', uom_id: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addLine() {
    setLines([...lines, { item_id: '', qty_ordered: '', unit_price: '', uom_id: '' }]);
  }

  function updateLine(idx: number, field: keyof NewPoLine, value: string) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ supplier_id: supplierId, expected_date: expectedDate, lines }),
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
        <Button onClick={() => setOpen(true)}>+ New PO</Button>
      </div>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
        <DataTable columns={COLUMNS(supplierMap)} data={orders}
          onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)} />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Purchase Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Supplier</label>
            <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Expected Date</label>
            <input required type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-neutral-600">Lines</label>
              <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline">+ Add line</button>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 mb-2 p-2 border-[0.5px] border-neutral-200 rounded">
                <input required placeholder="Item UUID" value={line.item_id}
                  onChange={(e) => updateLine(idx, 'item_id', e.target.value)}
                  className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded col-span-2" />
                <input required placeholder="Qty" type="number" value={line.qty_ordered}
                  onChange={(e) => updateLine(idx, 'qty_ordered', e.target.value)}
                  className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                <input required placeholder="Unit Price" type="number" value={line.unit_price}
                  onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                  className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                <input required placeholder="UOM UUID" value={line.uom_id}
                  onChange={(e) => updateLine(idx, 'uom_id', e.target.value)}
                  className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded col-span-2" />
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Creating…' : 'Create PO'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
