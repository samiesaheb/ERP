'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import type { Artwork, SalesOrder, Item } from '@/lib/types';

type ArtworkRow = Artwork & { so_number: string; item_label: string };

const COLUMNS: Column<ArtworkRow>[] = [
  { key: 'so_number',  header: 'Sales Order', sortable: true },
  { key: 'item_label', header: 'Item' },
  { key: 'version',    header: 'Version', render: (r) => `v${r.version}` },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (r) => (
      <Badge
        variant={
          r.status === 'approved'  ? 'green'
          : r.status === 'rejected'  ? 'red'
          : r.status === 'in_review' ? 'amber'
          : 'gray'
        }
      >
        {r.status}
      </Badge>
    ),
  },
  {
    key: 'approved_at',
    header: 'Approved',
    render: (r) => r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '—',
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
];

export default function ArtworkClient({
  artworks,
  salesOrders,
  items,
}: {
  artworks: Artwork[];
  salesOrders: SalesOrder[];
  items: Item[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sales_order_id: '', item_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const soMap   = Object.fromEntries(salesOrders.map((s) => [s.id, s.order_number]));
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.item_code} — ${i.description}`]));

  const rows: ArtworkRow[] = artworks.map((a) => ({
    ...a,
    so_number:  soMap[a.sales_order_id]  ?? a.sales_order_id,
    item_label: itemMap[a.item_id]       ?? a.item_id,
  }));

  async function handleSave() {
    setSaving(true);
    await fetch('/api/v1/artworks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-start mb-3">
        <Button onClick={() => setOpen(true)}>+ New Artwork</Button>
      </div>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={rows}
          actions={(_row) => [
            { label: 'Submit for Review', onClick: () => {} },
            { label: 'Approve',           onClick: () => {} },
            { label: 'Reject',            onClick: () => {}, variant: 'danger' },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Artwork">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Sales Order</label>
            <select
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              value={form.sales_order_id}
              onChange={(e) => setForm({ ...form, sales_order_id: e.target.value })}
            >
              <option value="">Select…</option>
              {salesOrders.map((s) => (
                <option key={s.id} value={s.id}>{s.order_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item</label>
            <select
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              value={form.item_id}
              onChange={(e) => setForm({ ...form, item_id: e.target.value })}
            >
              <option value="">Select…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.item_code} — {i.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Creating…' : 'Create Artwork'}
          </Button>
        </div>
      </SlideOver>
    </>
  );
}
