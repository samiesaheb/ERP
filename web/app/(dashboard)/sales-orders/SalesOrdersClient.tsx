'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { soStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { updateSalesOrderStatus } from '@/lib/mutations';
import type { SalesOrder, Customer, Country } from '@/lib/types';

interface Props {
  orders: SalesOrder[];
  customerMap: Record<string, string>;
  customers: Customer[];
  countries: Country[];
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
    key: 'required_date',
    header: 'Required By',
    render: (r) => r.required_date ? new Date(r.required_date).toLocaleDateString() : '—',
    sortable: true,
  },
  {
    key: 'created_at',
    header: 'Created',
    render: (r) => new Date(r.created_at).toLocaleDateString(),
    sortable: true,
  },
];

const CANCELLABLE = new Set(['draft', 'confirmed', 'in_production']);

interface NewSoForm {
  customer_id:   string;
  country_id:    string;
  total_pieces:  string;
  order_date:    string;
  required_date: string;
  fda_required:  boolean;
  notes:         string;
}

export default function SalesOrdersClient({ orders, customerMap, customers, countries }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewSoForm>({
    customer_id:   '',
    country_id:    '',
    total_pieces:  '',
    order_date:    '',
    required_date: '',
    fda_required:  false,
    notes:         '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true);
      router.replace('/sales-orders', { scroll: false });
    }
  }, [searchParams, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/sales-orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id:   form.customer_id,
          country_id:    form.country_id,
          total_pieces:  form.total_pieces,
          order_date:    form.order_date    || null,
          required_date: form.required_date || null,
          fda_required:  form.fda_required,
          notes:         form.notes         || null,
        }),
      });
      setOpen(false);
      setForm({ customer_id: '', country_id: '', total_pieces: '', order_date: '', required_date: '', fda_required: false, notes: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await updateSalesOrderStatus(id, 'cancelled');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  }

  return (
    <>
      <div className="flex justify-start mb-3">
        <Button onClick={() => setOpen(true)}>+ New Order</Button>
      </div>

      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(customerMap)}
          data={orders}
          onRowClick={(row) => router.push(`/sales-orders/${row.id}`)}
          actions={(row) => [
            { label: 'View Order', onClick: () => router.push(`/sales-orders/${row.id}`) },
            { label: 'Create MO',  onClick: () => router.push(`/manufacturing-orders?createFor=${row.id}`) },
            ...(CANCELLABLE.has(row.status)
              ? [{ label: 'Cancel Order', onClick: () => handleCancel(row.id), variant: 'danger' as const }]
              : []),
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Sales Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Customer</label>
            <select
              required
              value={form.customer_id}
              onChange={(e) => {
                const c = customers.find((x) => x.id === e.target.value);
                setForm({ ...form, customer_id: e.target.value, country_id: c?.country_id ?? form.country_id });
              }}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Destination Country</label>
            <select
              required
              value={form.country_id}
              onChange={(e) => setForm({ ...form, country_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
            >
              <option value="">Select country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Order Date</label>
              <input
                type="date"
                value={form.order_date}
                onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Required By</label>
              <input
                type="date"
                value={form.required_date}
                onChange={(e) => setForm({ ...form, required_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none"
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
