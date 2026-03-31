'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { Item, Uom, ItemType } from '@/lib/types';

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  fg: 'Finished Good',
  raw_mat: 'Raw Material',
  pack_mat: 'Packaging',
};

const ITEM_TYPE_VARIANTS: Record<ItemType, 'green' | 'blue' | 'amber'> = {
  fg: 'green',
  raw_mat: 'blue',
  pack_mat: 'amber',
};

const COLUMNS = (uomMap: Record<string, string>): Column<Item>[] => [
  { key: 'code', header: 'Code', sortable: true },
  { key: 'description', header: 'Description', sortable: true },
  {
    key: 'item_type',
    header: 'Type',
    render: (r) => (
      <Badge variant={ITEM_TYPE_VARIANTS[r.item_type]}>{ITEM_TYPE_LABELS[r.item_type]}</Badge>
    ),
    sortable: true,
  },
  { key: 'uom_id', header: 'UOM', render: (r) => uomMap[r.uom_id] ?? '—' },
  {
    key: 'is_active',
    header: 'Active',
    render: (r) => (
      <Badge variant={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
    ),
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
  const [form, setForm] = useState({ code: '', description: '', item_type: 'fg' as ItemType, uom_id: '' });
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
      <div className="flex justify-end mb-3">
        <Button onClick={() => setOpen(true)}>+ New Item</Button>
      </div>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
        <DataTable columns={COLUMNS(uomMap)} data={items} />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Code</label>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Description</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item Type</label>
            <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value as ItemType })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="fg">Finished Good</option>
              <option value="raw_mat">Raw Material</option>
              <option value="pack_mat">Packaging Material</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
            <select value={form.uom_id} onChange={(e) => setForm({ ...form, uom_id: e.target.value })}
              required className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select UOM</option>
              {uoms.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
            </select>
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
