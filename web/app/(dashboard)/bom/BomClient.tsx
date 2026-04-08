'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { Bom, Item } from '@/lib/types';

const COLUMNS = (itemMap: Record<string, string>): Column<Bom>[] => [
  {
    key: 'finished_good_id',
    header: 'Finished Good',
    render: (row) => itemMap[row.finished_good_id] ?? row.finished_good_id,
    sortable: true,
  },
  {
    key: 'description',
    header: 'Description',
    render: (row) => row.description ?? '—',
  },
  {
    key: 'version',
    header: 'Version',
    sortable: true,
    render: (row) => `v${row.version}`,
  },
  {
    key: 'is_active',
    header: 'Status',
    render: (row) => (
      <Badge variant={row.is_active ? 'green' : 'amber'}>{row.is_active ? 'Active' : 'Draft'}</Badge>
    ),
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (row) => new Date(row.created_at).toLocaleDateString(),
  },
];

export default function BomClient({
  boms,
  items,
  itemMap,
}: {
  boms: Bom[];
  items: Item[];
  itemMap: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ finished_good_id: '', description: '', version: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/boms', {
        method: 'POST',
        body: JSON.stringify({ ...form, version: Number(form.version) }),
      });
      setOpen(false);
      setForm({ finished_good_id: '', description: '', version: 1 });
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
        <Button onClick={() => setOpen(true)}>+ New BOM</Button>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(itemMap)}
          data={boms}
          actions={(row) => [
            { label: 'View',      onClick: () => router.push(`/bom/${row.id}`) },
            { label: 'Duplicate', onClick: () => {} },
            { label: 'Delete',    onClick: () => {}, variant: 'danger' },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Bill of Materials">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Finished Good
            </label>
            <select
              required
              value={form.finished_good_id}
              onChange={(e) => setForm({ ...form, finished_good_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
            >
              <option value="">Select item…</option>
              {items.filter((i) => i.item_type === 'FG').map((i) => (
                <option key={i.id} value={i.id}>
                  {i.item_code} — {i.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes about this BOM"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Version</label>
            <input
              required
              type="number"
              min={1}
              value={form.version}
              onChange={(e) => setForm({ ...form, version: parseInt(e.target.value, 10) || 1 })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create BOM'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
