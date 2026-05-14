'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { moStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { updateManufacturingOrderStatus } from '@/lib/mutations';
import { useAppPrefs } from '@/contexts/AppPrefsContext';
import type { ManufacturingOrder, SalesOrder, Item, Uom, Bom } from '@/lib/types';

const COLUMNS = (
  t: (k: string) => string,
  soMap: Record<string, string>,
  itemMap: Record<string, string>
): Column<ManufacturingOrder>[] => [
  { key: 'mo_number', header: t('MO #'), sortable: true },
  { key: 'sales_order_id', header: t('Sales Order'), render: (r) => r.sales_order_id ? soMap[r.sales_order_id] ?? '—' : '—' },
  { key: 'item_id', header: t('Finished Good'), render: (r) => itemMap[r.item_id] ?? '—' },
  { key: 'qty_planned', header: t('Planned Qty'),
    render: (r) => Number(r.qty_planned).toLocaleString(), className: 'tabular-nums', sortable: true },
  { key: 'qty_produced', header: t('Produced'),
    render: (r) => Number(r.qty_produced).toLocaleString(), className: 'tabular-nums' },
  { key: 'status', header: t('Status'),
    render: (r) => <Badge variant={moStatusVariant(r.status)}>{r.status}</Badge>, sortable: true },
  { key: 'created_at', header: t('Created'),
    render: (r) => new Date(r.created_at).toLocaleDateString(), sortable: true },
];

export default function MoClient({
  mos, soMap, itemMap, salesOrders, items, uoms, boms,
}: {
  mos: ManufacturingOrder[];
  soMap: Record<string, string>;
  itemMap: Record<string, string>;
  salesOrders: SalesOrder[];
  items: Item[];
  uoms: Uom[];
  boms: Bom[];
}) {
  const router = useRouter();
  const { t } = useAppPrefs();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    sales_order_id: '',
    item_id:        '',
    bom_id:         '',
    qty_planned:    '',
    uom_id:         '',
    planned_start:  '',
    planned_end:    '',
    notes:          '',
  });

  useEffect(() => {
    const createFor = searchParams.get('createFor');
    if (createFor) {
      setForm((f) => ({ ...f, sales_order_id: createFor }));
      setOpen(true);
      router.replace('/manufacturing-orders', { scroll: false });
    } else if (searchParams.get('new') === '1') {
      setOpen(true);
      router.replace('/manufacturing-orders', { scroll: false });
    }
  }, [searchParams, router]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        sales_order_id: form.sales_order_id || null,
        planned_start:  form.planned_start  || null,
        planned_end:    form.planned_end    || null,
        notes:          form.notes          || null,
      };
      await clientFetch('/api/v1/manufacturing-orders', { method: 'POST', body: JSON.stringify(payload) });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const fgItems = items.filter((i) => i.item_type === 'FG');
  const availableBoms = form.item_id
    ? boms.filter((b) => b.finished_good_id === form.item_id && b.is_active)
    : boms.filter((b) => b.is_active);

  return (
    <>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(t, soMap, itemMap)}
          toolbar={<Button onClick={() => setOpen(true)}>+ New MO</Button>}
          data={mos}
          onRowClick={(row) => router.push(`/manufacturing-orders/${row.id}`)}
          actions={(row) => [
            { label: 'View MO',          onClick: () => router.push(`/manufacturing-orders/${row.id}`) },
            { label: 'Production Floor', onClick: () => router.push('/production') },
            { label: 'Edit',             onClick: () => router.push(`/manufacturing-orders/${row.id}`) },
            { label: 'Cancel',           onClick: () => updateManufacturingOrderStatus(row.id, 'cancelled').then(() => router.refresh()), variant: 'danger' },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Manufacturing Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Sales Order (optional)</label>
            <ComboBox
              value={form.sales_order_id}
              onChange={(v) => setForm({ ...form, sales_order_id: v })}
              options={[{ value: '', label: 'No linked SO' }, ...salesOrders.map((s) => ({ value: s.id, label: s.order_number }))]}
              placeholder="No linked SO"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Finished Good</label>
            <ComboBox
              required
              value={form.item_id}
              onChange={(v) => setForm({ ...form, item_id: v, bom_id: '' })}
              options={fgItems.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))}
              placeholder="Select item"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">BOM</label>
            <ComboBox
              required
              value={form.bom_id}
              onChange={(v) => setForm({ ...form, bom_id: v })}
              options={availableBoms.map((b) => ({ value: b.id, label: `${b.description ?? `v${b.version}`} (v${b.version})` }))}
              placeholder="Select BOM"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Planned Qty</label>
            <input required type="number" min="1" value={form.qty_planned}
              onChange={(e) => setForm({ ...form, qty_planned: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
            <ComboBox
              required
              value={form.uom_id}
              onChange={(v) => setForm({ ...form, uom_id: v })}
              options={uoms.map((u) => ({ value: u.id, label: u.code }))}
              placeholder="Select UOM"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Planned Start</label>
              <input type="date" value={form.planned_start}
                onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Planned End</label>
              <input type="date" value={form.planned_end}
                onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} placeholder="Optional notes"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Creating…' : 'Create MO'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
