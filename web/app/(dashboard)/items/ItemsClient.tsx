'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { updateItem } from '@/lib/mutations';
import type { Item, Uom } from '@/lib/types';

const ITEM_TYPE_LABELS: Record<string, string> = {
  FG:      'Finished Good',
  RawMat:  'Raw Material',
  PackMat: 'Packaging',
};

const ITEM_TYPE_VARIANTS: Record<string, 'green' | 'blue' | 'amber'> = {
  FG:      'green',
  RawMat:  'blue',
  PackMat: 'amber',
};

const COLUMNS = (uomMap: Record<string, string>): Column<Item>[] => [
  { key: 'item_code', header: 'Code', sortable: true },
  { key: 'description', header: 'Description', sortable: true },
  {
    key: 'item_type',
    header: 'Type',
    render: (r) => (
      <Badge variant={ITEM_TYPE_VARIANTS[r.item_type] ?? 'gray'}>
        {ITEM_TYPE_LABELS[r.item_type] ?? r.item_type}
      </Badge>
    ),
    sortable: true,
  },
  { key: 'uom_id', header: 'UOM', render: (r) => uomMap[r.uom_id] ?? '—' },
  {
    key: 'fda_required',
    header: 'FDA',
    render: (r) => (
      <Badge variant={r.fda_required ? 'amber' : 'gray'}>{r.fda_required ? 'Required' : '—'}</Badge>
    ),
  },
  {
    key: 'is_active',
    header: 'Active',
    render: (r) => (
      <Badge variant={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
    ),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
];

export default function ItemsClient({
  items,
  uomMap,
  uoms,
}: {
  items: Item[];
  uomMap: Record<string, string>;
  uoms: Uom[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    item_code:    '',
    description:  '',
    item_type:    'FG',
    uom_id:       '',
    fda_required: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/items', { method: 'POST', body: JSON.stringify(form) });
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
        <Button onClick={() => setOpen(true)}>+ New Item</Button>
      </div>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(uomMap)}
          data={items}
          actions={(row) => [
            { label: 'Edit',        onClick: () => setOpen(true) },
            { label: 'View BOM',    onClick: () => router.push('/bom') },
            {
              label: row.is_active ? 'Deactivate' : 'Reactivate',
              onClick: () => updateItem(row.id, { is_active: !row.is_active }).then(() => router.refresh()),
              variant: row.is_active ? 'danger' : undefined,
            },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item Code</label>
            <input required value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })}
              placeholder="e.g. FG-001"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Description</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item Type</label>
            <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="FG">Finished Good</option>
              <option value="RawMat">Raw Material</option>
              <option value="PackMat">Packaging Material</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
            <select value={form.uom_id} onChange={(e) => setForm({ ...form, uom_id: e.target.value })}
              required className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select UOM</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.code}{u.description ? ` — ${u.description}` : ''}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="fda_req" checked={form.fda_required}
              onChange={(e) => setForm({ ...form, fda_required: e.target.checked })} />
            <label htmlFor="fda_req" className="text-sm text-neutral-700">FDA registration required</label>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Creating…' : 'Create Item'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
