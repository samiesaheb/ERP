'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import DataTable, { Column } from '@/components/ui/DataTable';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { deleteFormulation } from '@/lib/mutations';
import type { Formulation, FormulationProduct } from '@/lib/types';

const COLUMNS = (
  productMap: Record<string, FormulationProduct>,
): Column<Formulation>[] => [
  {
    key: 'product',
    header: 'SKU',
    render: (row) => (
      <span className="font-mono text-xs text-neutral-500">
        {row.product_detail?.sku ?? productMap[row.product]?.sku ?? '—'}
      </span>
    ),
  },
  {
    key: 'product_name',
    header: 'Product',
    render: (row) =>
      row.product_detail?.name ?? productMap[row.product]?.name ?? row.product,
    sortable: true,
  },
  {
    key: 'version',
    header: 'Ver.',
    sortable: true,
    render: (row) => <span className="font-mono text-xs">v{row.version}</span>,
  },
  {
    key: 'lines',
    header: 'Ingredients',
    render: (row) => row.lines?.length ?? 0,
  },
  {
    key: 'total_pct',
    header: 'Total %',
    render: (row) => {
      const total = (row.lines ?? []).reduce(
        (s, l) => s + parseFloat(l.percentage || '0'),
        0,
      );
      const ok = Math.abs(total - 100) < 0.01;
      return (
        <span
          className={`font-mono text-xs ${ok ? 'text-green-600' : 'text-amber-600'}`}
        >
          {total.toFixed(2)}%
        </span>
      );
    },
  },
  {
    key: 'is_active',
    header: 'Status',
    render: (row) => (
      <Badge variant={row.is_active ? 'green' : 'amber'}>
        {row.is_active ? 'Active' : 'Draft'}
      </Badge>
    ),
  },
];

export default function FormulationsClient({
  formulations,
  products,
  productMap,
}: {
  formulations: Formulation[];
  products: FormulationProduct[];
  productMap: Record<string, FormulationProduct>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product: '', version: 1, batch_qty: '100', batch_unit: 'g' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await clientFetch<{ id: string }>('/api/v1/formulations', {
        method: 'POST',
        body: JSON.stringify({
          product: form.product,
          version: Number(form.version),
          is_active: false,
          note: '',
          batch_qty: form.batch_qty,
          batch_unit: form.batch_unit,
          lines: [],
        }),
      });
      setOpen(false);
      setForm({ product: '', version: 1, batch_qty: '100', batch_unit: 'g' });
      router.push(`/formulations/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(productMap)}
          toolbar={<Button onClick={() => setOpen(true)}>+ New Formulation</Button>}
          data={formulations}
          onRowClick={(row) => router.push(`/formulations/${row.id}`)}
          actions={(row) => [
            { label: 'Open', onClick: () => router.push(`/formulations/${row.id}`) },
            {
              label: 'Delete',
              onClick: () =>
                deleteFormulation(row.id).then(() => router.refresh()),
              variant: 'danger',
            },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Formulation">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Product *
            </label>
            <ComboBox
              required
              value={form.product}
              onChange={(v) => setForm({ ...form, product: v })}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.sku} — ${p.name}`,
              }))}
              placeholder="Select product…"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Version
            </label>
            <input
              required
              type="number"
              min={1}
              value={form.version}
              onChange={(e) =>
                setForm({ ...form, version: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Batch Quantity
            </label>
            <div className="flex gap-2">
              <input
                required
                type="number"
                step="0.0001"
                min="0.0001"
                value={form.batch_qty}
                onChange={(e) => setForm({ ...form, batch_qty: e.target.value })}
                placeholder="100"
                className="flex-1 px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded font-mono"
              />
              <select
                value={form.batch_unit}
                onChange={(e) => setForm({ ...form, batch_unit: e.target.value })}
                className="w-20 px-2 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="L">L</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create & Open'}
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
