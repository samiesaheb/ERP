'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge, { paymentStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import type { Payment, Customer, Supplier, Invoice, PurchaseOrder } from '@/lib/types';

interface Props {
  payments:       Payment[];
  customers:      Customer[];
  suppliers:      Supplier[];
  invoices:       Invoice[];
  purchaseOrders: PurchaseOrder[];
  customerMap:    Record<string, string>;
  supplierMap:    Record<string, string>;
}

const COLUMNS = (
  customerMap: Record<string, string>,
  supplierMap: Record<string, string>,
): Column<Payment>[] => [
  { key: 'payment_number', header: 'Payment #', sortable: true },
  { key: 'payment_type',   header: 'Type',
    render: (r) => (
      <Badge variant={r.payment_type === 'customer' ? 'blue' : 'purple'}>
        {r.payment_type}
      </Badge>
    ),
  },
  { key: 'customer_id', header: 'Party',
    render: (r) =>
      r.payment_type === 'customer'
        ? (customerMap[r.customer_id ?? ''] ?? '—')
        : (supplierMap[r.supplier_id ?? ''] ?? '—'),
  },
  { key: 'amount', header: 'Amount', sortable: true, className: 'tabular-nums',
    render: (r) => `${r.currency} ${Number(r.amount).toLocaleString()}` },
  { key: 'method',       header: 'Method',  render: (r) => r.method   ?? '—' },
  { key: 'payment_date', header: 'Date',    render: (r) => r.payment_date ?? '—', sortable: true },
  { key: 'status',       header: 'Status',  sortable: true,
    render: (r) => <Badge variant={paymentStatusVariant(r.status)}>{r.status}</Badge> },
];

interface Form {
  payment_type:      'customer' | 'supplier';
  customer_id:       string;
  supplier_id:       string;
  invoice_id:        string;
  purchase_order_id: string;
  amount:            string;
  currency:          string;
  payment_date:      string;
  method:            string;
  reference:         string;
  notes:             string;
}

const EMPTY: Form = {
  payment_type:      'customer',
  customer_id:       '',
  supplier_id:       '',
  invoice_id:        '',
  purchase_order_id: '',
  amount:            '',
  currency:          'USD',
  payment_date:      '',
  method:            '',
  reference:         '',
  notes:             '',
};

export default function PaymentsClient({
  payments, customers, suppliers, invoices, purchaseOrders, customerMap, supplierMap,
}: Props) {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function set<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify({
          payment_type:      form.payment_type,
          customer_id:       form.payment_type === 'customer' && form.customer_id       ? form.customer_id       : null,
          supplier_id:       form.payment_type === 'supplier' && form.supplier_id       ? form.supplier_id       : null,
          invoice_id:        form.payment_type === 'customer' && form.invoice_id        ? form.invoice_id        : null,
          purchase_order_id: form.payment_type === 'supplier' && form.purchase_order_id ? form.purchase_order_id : null,
          amount:            form.amount,
          currency:          form.currency,
          payment_date:      form.payment_date || null,
          method:            form.method       || null,
          reference:         form.reference    || null,
          notes:             form.notes        || null,
        }),
      });
      setOpen(false);
      setForm(EMPTY);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const isCustomer = form.payment_type === 'customer';

  return (
    <>
      <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden">
        <DataTable
          columns={COLUMNS(customerMap, supplierMap)}
          toolbar={<Button onClick={() => setOpen(true)}>+ New Payment</Button>}
          data={payments}
          searchable
          actions={(row) => [
            ...(row.invoice_id
              ? [{ label: 'View Invoice', onClick: () => router.push(`/invoicing/${row.invoice_id}`) }]
              : []),
            ...(row.purchase_order_id
              ? [{ label: 'View PO', onClick: () => router.push(`/purchase-orders/${row.purchase_order_id}`) }]
              : []),
            { label: 'View All Invoices', onClick: () => router.push('/invoicing') },
          ]}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment type toggle */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Payment Type</label>
            <div className="flex rounded border-[0.5px] border-neutral-300 overflow-hidden">
              {(['customer', 'supplier'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('payment_type', t)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                    form.payment_type === t
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Party */}
          {isCustomer ? (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Customer</label>
              <select
                value={form.customer_id}
                onChange={(e) => set('customer_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
              >
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Supplier</label>
              <select
                value={form.supplier_id}
                onChange={(e) => set('supplier_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Reference document */}
          {isCustomer ? (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Invoice (optional)</label>
              <select
                value={form.invoice_id}
                onChange={(e) => set('invoice_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
              >
                <option value="">— none —</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.invoice_number}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Purchase Order (optional)</label>
              <select
                value={form.purchase_order_id}
                onChange={(e) => set('purchase_order_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
              >
                <option value="">— none —</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>{po.po_number}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Amount</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>THB</option>
                <option>AED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Payment Date</label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => set('payment_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Method</label>
              <select
                value={form.method}
                onChange={(e) => set('method', e.target.value)}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded bg-white"
              >
                <option value="">Select method</option>
                <option>Wire</option>
                <option>ACH</option>
                <option>Check</option>
                <option>Credit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Reference</label>
            <input
              type="text"
              placeholder="Bank ref / check number"
              value={form.reference}
              onChange={(e) => set('reference', e.target.value)}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Record Payment'}
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
