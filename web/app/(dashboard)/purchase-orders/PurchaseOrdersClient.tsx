'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { poStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { updatePurchaseOrderStatus } from '@/lib/mutations';
import type { PurchaseOrder, Supplier, Item, Uom, ManufacturingOrder } from '@/lib/types';

const COLUMNS = (supplierMap: Record<string, string>): Column<PurchaseOrder>[] => [
  { key: 'po_number', header: 'PO #', sortable: true },
  { key: 'supplier_id', header: 'Supplier', render: (r) => supplierMap[r.supplier_id] ?? '—' },
  { key: 'status', header: 'Status',
    render: (r) => <Badge variant={poStatusVariant(r.status)}>{r.status}</Badge>, sortable: true },
  { key: 'order_date', header: 'Order Date', render: (r) => r.order_date ?? '—', sortable: true },
  { key: 'expected_date', header: 'Expected', render: (r) => r.expected_date ?? '—', sortable: true },
  { key: 'created_at', header: 'Created', sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString() },
];

interface NewPoLine {
  item_id:    string;
  qty_ordered: string;
  unit_cost:  string;
  uom_id:     string;
}

const EMPTY_FORM = {
  supplier_id:             '',
  manufacturing_order_id:  '',
  order_date:              '',
  expected_date:           '',
  notes:                   '',
};

export default function PurchaseOrdersClient({
  orders,
  supplierMap,
  suppliers,
  items,
  uoms,
  manufacturingOrders,
}: {
  orders:               PurchaseOrder[];
  supplierMap:          Record<string, string>;
  suppliers:            Supplier[];
  items:                Item[];
  uoms:                 Uom[];
  manufacturingOrders:  ManufacturingOrder[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true);
      router.replace('/purchase-orders', { scroll: false });
    }
  }, [searchParams, router]);

  const [lines, setLines] = useState<NewPoLine[]>([
    { item_id: '', qty_ordered: '', unit_cost: '', uom_id: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addLine() {
    setLines([...lines, { item_id: '', qty_ordered: '', unit_cost: '', uom_id: '' }]);
  }

  function removeLine(idx: number) {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof NewPoLine, value: string) {
    setLines(lines.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
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
      await clientFetch('/api/v1/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id:            form.supplier_id,
          manufacturing_order_id: form.manufacturing_order_id || null,
          order_date:             form.order_date             || null,
          expected_date:          form.expected_date          || null,
          notes:                  form.notes                  || null,
          lines: lines.map((l) => ({
            ...l,
            unit_cost: l.unit_cost || null,
          })),
        }),
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      setLines([{ item_id: '', qty_ordered: '', unit_cost: '', uom_id: '' }]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(supplierMap)}
          toolbar={<Button onClick={() => setOpen(true)}>+ New PO</Button>}
          data={orders}
          onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
          actions={(row) => [
            { label: 'View PO',    onClick: () => router.push(`/purchase-orders/${row.id}`) },
            { label: 'Receive',    onClick: () => router.push('/receiving') },
            { label: 'Edit',       onClick: () => router.push(`/purchase-orders/${row.id}`) },
            { label: 'Cancel PO',  onClick: () => updatePurchaseOrderStatus(row.id, 'cancelled').then(() => router.refresh()), variant: 'danger' },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Purchase Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Supplier</label>
            <select required value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Linked MO (optional)</label>
            <select value={form.manufacturing_order_id} onChange={(e) => setForm({ ...form, manufacturing_order_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">None</option>
              {manufacturingOrders.map((m) => <option key={m.id} value={m.id}>{m.mo_number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Order Date</label>
              <input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Expected Date</label>
              <input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} placeholder="Optional notes"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-neutral-600">Lines</label>
              <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:underline">+ Add line</button>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 mb-2 p-2 border-[0.5px] border-neutral-200 rounded">
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">Line {idx + 1}</span>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)} className="text-[11px] text-red-500 hover:underline">Remove</button>
                  )}
                </div>
                <select required value={line.item_id}
                  onChange={(e) => updateLine(idx, 'item_id', e.target.value)}
                  className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded col-span-2 bg-white">
                  <option value="">Select item…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.item_code} — {i.description}</option>)}
                </select>
                <input required placeholder="Qty" type="number" min="0.0001" step="any" value={line.qty_ordered}
                  onChange={(e) => updateLine(idx, 'qty_ordered', e.target.value)}
                  className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                <input placeholder="Unit Cost" type="number" min="0" step="any" value={line.unit_cost}
                  onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                  className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded" />
                <select required value={line.uom_id}
                  onChange={(e) => updateLine(idx, 'uom_id', e.target.value)}
                  className="px-2 py-1.5 text-xs border-[0.5px] border-neutral-300 rounded col-span-2 bg-white">
                  <option value="">Select UOM…</option>
                  {uoms.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
                </select>
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
