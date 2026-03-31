'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { soStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { SalesOrder } from '@/lib/types';

interface Props {
  orders: SalesOrder[];
  customerMap: Record<string, string>;
}

const COLUMNS = (customerMap: Record<string, string>): Column<SalesOrder>[] => [
  { key: 'order_number', header: 'SO #', sortable: true },
  {
    key: 'customer_id',
    header: 'Customer',
    render: (r) => customerMap[r.customer_id] ?? r.customer_id,
    sortable: true,
  },
  {
    key: 'total_pieces',
    header: 'Pieces',
    render: (r) => Number(r.total_pieces).toLocaleString(),
    sortable: true,
    className: 'tabular-nums',
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <Badge variant={soStatusVariant(r.status)}>{r.status}</Badge>,
    sortable: true,
  },
  {
    key: 'artwork_status',
    header: 'Artwork',
    render: (r) => <Badge variant={r.artwork_status === 'approved' ? 'green' : 'amber'}>{r.artwork_status}</Badge>,
  },
  {
    key: 'fda_required',
    header: 'FDA',
    render: (r) =>
      r.fda_required ? (
        <Badge variant={r.fda_status === 'approved' ? 'green' : 'amber'}>
          {r.fda_status ?? 'required'}
        </Badge>
      ) : (
        <Badge variant="gray">—</Badge>
      ),
  },
  {
    key: 'created_at',
    header: 'Created',
    render: (r) => new Date(r.created_at).toLocaleDateString(),
    sortable: true,
  },
];

interface NewSoForm {
  customer_id: string;
  country_id: string;
  total_pieces: string;
  fda_required: boolean;
}

export default function SalesOrdersClient({ orders, customerMap }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewSoForm>({
    customer_id: '',
    country_id: '',
    total_pieces: '',
    fda_required: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/sales-orders', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          total_pieces: form.total_pieces,
        }),
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
        <Button onClick={() => setOpen(true)}>+ New Order</Button>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
        <DataTable
          columns={COLUMNS(customerMap)}
          data={orders}
          onRowClick={(row) => router.push(`/sales-orders/${row.id}`)}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Sales Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Customer ID</label>
            <input
              required
              value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              placeholder="UUID"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Country ID</label>
            <input
              required
              value={form.country_id}
              onChange={(e) => setForm({ ...form, country_id: e.target.value })}
              placeholder="UUID"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Total Pieces</label>
            <input
              required
              type="number"
              min="1"
              value={form.total_pieces}
              onChange={(e) => setForm({ ...form, total_pieces: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fda"
              checked={form.fda_required}
              onChange={(e) => setForm({ ...form, fda_required: e.target.checked })}
            />
            <label htmlFor="fda" className="text-sm text-neutral-700">FDA registration required</label>
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Order'}
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
