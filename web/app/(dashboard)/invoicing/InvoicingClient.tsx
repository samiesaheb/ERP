'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { invoiceStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { updateInvoiceStatus } from '@/lib/mutations';
import type { Invoice, Customer, SalesOrder } from '@/lib/types';

const COLUMNS = (
  customerMap: Record<string, string>,
  soMap: Record<string, string>
): Column<Invoice>[] => [
  { key: 'invoice_number', header: 'Invoice #', sortable: true },
  { key: 'sales_order_id', header: 'SO', render: (r) => soMap[r.sales_order_id] ?? '—' },
  { key: 'customer_id', header: 'Customer', render: (r) => customerMap[r.customer_id] ?? '—' },
  { key: 'total', header: 'Total',
    render: (r) => r.total ? `${r.currency} ${Number(r.total).toLocaleString()}` : '—',
    sortable: true, className: 'tabular-nums' },
  { key: 'due_date', header: 'Due Date', render: (r) => r.due_date ?? '—', sortable: true },
  { key: 'status', header: 'Status',
    render: (r) => <Badge variant={invoiceStatusVariant(r.status)}>{r.status}</Badge>, sortable: true },
  { key: 'created_at', header: 'Created', sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString() },
];

export default function InvoicingClient({
  invoices, customerMap, soMap, customers, salesOrders,
}: {
  invoices: Invoice[];
  customerMap: Record<string, string>;
  soMap: Record<string, string>;
  customers: Customer[];
  salesOrders: SalesOrder[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    sales_order_id: '',
    customer_id:    '',
    due_date:       '',
    currency:       'USD',
    notes:          '',
  });

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true);
      router.replace('/invoicing', { scroll: false });
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
        due_date: form.due_date || null,
        notes:    form.notes    || null,
      };
      await clientFetch('/api/v1/invoices', { method: 'POST', body: JSON.stringify(payload) });
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
        <Button onClick={() => setOpen(true)}>+ New Invoice</Button>
      </div>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(customerMap, soMap)}
          data={invoices}
          onRowClick={(row) => router.push(`/invoicing/${row.id}`)}
          actions={(row) => {
            const items: { label: string; onClick: () => void; variant?: 'danger' }[] = [
              { label: 'View Details', onClick: () => router.push(`/invoicing/${row.id}`) },
            ];
            if (row.status === 'draft') {
              items.push({ label: 'Send Invoice', onClick: () => updateInvoiceStatus(row.id, 'sent').then(() => router.refresh()) });
              items.push({ label: 'Cancel', onClick: () => updateInvoiceStatus(row.id, 'cancelled').then(() => router.refresh()), variant: 'danger' });
            } else if (row.status === 'sent' || row.status === 'partially_paid') {
              items.push({ label: 'Mark Paid', onClick: () => updateInvoiceStatus(row.id, 'paid').then(() => router.refresh()) });
              items.push({ label: 'Mark Overdue', onClick: () => updateInvoiceStatus(row.id, 'overdue').then(() => router.refresh()) });
            } else if (row.status === 'overdue') {
              items.push({ label: 'Mark Paid', onClick: () => updateInvoiceStatus(row.id, 'paid').then(() => router.refresh()) });
            }
            return items;
          }}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Invoice">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Sales Order</label>
            <select required value={form.sales_order_id}
              onChange={(e) => setForm({ ...form, sales_order_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select SO</option>
              {salesOrders.map((s) => <option key={s.id} value={s.id}>{s.order_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Customer</label>
            <select required value={form.customer_id}
              onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Currency</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="THB">THB</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Due Date</label>
            <input type="date" value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Creating…' : 'Create Invoice'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
