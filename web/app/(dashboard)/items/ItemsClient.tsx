'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
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

interface Form {
  item_code:    string;
  description:  string;
  item_type:    string;
  uom_id:       string;
  fda_required: boolean;
}

const EMPTY: Form = {
  item_code:    '',
  description:  '',
  item_type:    'FG',
  uom_id:       '',
  fda_required: false,
};

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
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function openCreate() {
    setEditingItem(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  }

  function openEdit(item: Item) {
    setEditingItem(item);
    setForm({
      item_code:    item.item_code,
      description:  item.description,
      item_type:    item.item_type,
      uom_id:       item.uom_id,
      fda_required: item.fda_required,
    });
    setError('');
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editingItem) {
        await clientFetch(`/api/v1/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            description:  form.description,
            fda_required: form.fda_required,
            is_active:    undefined,
          }),
        });
      } else {
        await clientFetch('/api/v1/items', { method: 'POST', body: JSON.stringify(form) });
      }
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
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(uomMap)}
          toolbar={<Button onClick={openCreate}>+ New Item</Button>}
          data={items}
          actions={(row) => [
            { label: 'Edit',        onClick: () => openEdit(row) },
            { label: 'View BOM',    onClick: () => router.push('/bom') },
            {
              label: row.is_active ? 'Deactivate' : 'Reactivate',
              onClick: () => updateItem(row.id, { is_active: !row.is_active }).then(() => router.refresh()),
              variant: row.is_active ? 'danger' : undefined,
            },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title={editingItem ? 'Edit Item' : 'New Item'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item Code</label>
            <input required value={form.item_code}
              onChange={(e) => setForm({ ...form, item_code: e.target.value })}
              disabled={!!editingItem}
              placeholder="e.g. FG-001"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded disabled:bg-neutral-50 disabled:text-neutral-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Description</label>
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item Type</label>
            <ComboBox
              freeform
              value={form.item_type}
              onChange={(v) => setForm({ ...form, item_type: v })}
              disabled={!!editingItem}
              options={[
                { value: 'FG',      label: 'Finished Good' },
                { value: 'RawMat',  label: 'Raw Material' },
                { value: 'PackMat', label: 'Packaging Material' },
              ]}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
            <ComboBox
              required
              value={form.uom_id}
              onChange={(v) => setForm({ ...form, uom_id: v })}
              disabled={!!editingItem}
              options={uoms.map((u) => ({ value: u.id, label: u.code + (u.description ? ` — ${u.description}` : '') }))}
              placeholder="Select UOM"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded disabled:bg-neutral-50 disabled:text-neutral-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="fda_req" checked={form.fda_required}
              onChange={(e) => setForm({ ...form, fda_required: e.target.checked })} />
            <label htmlFor="fda_req" className="text-sm text-neutral-700">FDA registration required</label>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (editingItem ? 'Saving…' : 'Creating…') : (editingItem ? 'Save Changes' : 'Create Item')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
