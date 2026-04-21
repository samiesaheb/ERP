'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge, { invoiceStatusVariant } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { clientFetch } from '@/lib/client-api';
import { updateInvoiceStatus } from '@/lib/mutations';
import type { Invoice, InvoiceLine, Item, Uom } from '@/lib/types';

interface Props {
  invoice:     Invoice;
  lines:       InvoiceLine[];
  customerMap: Record<string, string>;
  soMap:       Record<string, string>;
  items:       Item[];
  itemMap:     Record<string, string>;
  uoms:        Uom[];
  uomMap:      Record<string, string>;
}

const NEXT_ACTIONS: Record<string, { label: string; next: string }[]> = {
  draft:          [{ label: 'Send Invoice', next: 'sent' }],
  sent:           [{ label: 'Mark Paid', next: 'paid' }, { label: 'Mark Overdue', next: 'overdue' }],
  partially_paid: [{ label: 'Mark Paid', next: 'paid' }, { label: 'Mark Overdue', next: 'overdue' }],
  overdue:        [{ label: 'Mark Paid', next: 'paid' }],
};

function fmtMoney(v: string | null | undefined, currency: string) {
  if (!v) return '—';
  return `${currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoiceDetailClient({
  invoice, lines, customerMap, soMap, items, itemMap, uoms, uomMap,
}: Props) {
  const router = useRouter();

  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState({
    item_id:     '',
    description: '',
    qty:         '',
    uom_id:      '',
    unit_price:  '',
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const lineTotal = form.qty && form.unit_price
    ? (Number(form.qty) * Number(form.unit_price)).toFixed(4)
    : null;

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await clientFetch(`/api/v1/invoices/${invoice.id}/lines`, {
        method: 'POST',
        body: JSON.stringify({
          item_id:     form.item_id     || null,
          description: form.description || null,
          qty:         form.qty,
          uom_id:      form.uom_id,
          unit_price:  form.unit_price,
        }),
      });
      setOpen(false);
      setForm({ item_id: '', description: '', qty: '', uom_id: '', unit_price: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  const actions = NEXT_ACTIONS[invoice.status] ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Invoice</p>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-500">Customer</span>
              <span className="font-medium">{customerMap[invoice.customer_id] ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Sales Order</span>
              <span>{soMap[invoice.sales_order_id] ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Issue Date</span>
              <span>{invoice.issue_date ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Due Date</span>
              <span>{invoice.due_date ?? '—'}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Totals</p>
          </CardHeader>
          <CardBody className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subtotal</span>
              <span className="tabular-nums">{fmtMoney(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Tax</span>
              <span className="tabular-nums">{fmtMoney(invoice.tax, invoice.currency)}</span>
            </div>
            <div className="flex justify-between border-t-[0.5px] border-neutral-200 pt-2">
              <span className="font-semibold">Total</span>
              <span className="font-semibold tabular-nums">{fmtMoney(invoice.total, invoice.currency)}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</p>
          </CardHeader>
          <CardBody className="text-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Status</span>
              <Badge variant={invoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
            </div>
            {actions.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                {actions.map(({ label, next }) => (
                  <Button key={next}
                    onClick={() => updateInvoiceStatus(invoice.id, next).then(() => router.refresh())}
                    variant={next === 'paid' ? 'primary' : 'secondary'}
                    className="w-full">
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Invoice Lines */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Invoice Lines</p>
          {!['paid', 'cancelled'].includes(invoice.status) && (
            <Button onClick={() => setOpen(true)}>+ Add Line</Button>
          )}
        </CardHeader>
        <div className="overflow-x-auto">
          {lines.length === 0 ? (
            <div className="px-4 py-6 text-sm text-neutral-400">
              No lines yet — add lines to calculate the invoice total.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-[0.5px] border-neutral-200 bg-neutral-50">
                  {['Item / Description', 'Qty', 'UOM', 'Unit Price', 'Line Total'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b-[0.5px] border-neutral-100 last:border-0">
                    <td className="px-4 py-3">
                      {line.item_id ? itemMap[line.item_id] : (line.description ?? '—')}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{Number(line.qty).toLocaleString()}</td>
                    <td className="px-4 py-3 text-neutral-500">{uomMap[line.uom_id] ?? line.uom_id}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(line.unit_price, invoice.currency)}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{fmtMoney(line.line_total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Add Line slide-over */}
      <SlideOver open={open} onClose={() => setOpen(false)} title="Add Invoice Line">
        <form onSubmit={handleAddLine} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Item (optional)</label>
            <ComboBox
              value={form.item_id}
              onChange={(v) => {
                const item = items.find((i) => i.id === v);
                setForm({
                  ...form,
                  item_id: v,
                  description: item ? `${item.item_code} — ${item.description}` : form.description,
                  uom_id: item?.uom_id ?? form.uom_id,
                });
              }}
              options={[{ value: '', label: '— free-text line —' }, ...items.map((i) => ({ value: i.id, label: `${i.item_code} — ${i.description}` }))]}
              placeholder="— free-text line —"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Description</label>
            <input type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Line description"
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Qty</label>
              <input required type="number" min="0.0001" step="any" value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">UOM</label>
              <ComboBox
                required
                value={form.uom_id}
                onChange={(v) => setForm({ ...form, uom_id: v })}
                options={uoms.map((u) => ({ value: u.id, label: u.code }))}
                placeholder="Select"
                className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Unit Price ({invoice.currency})</label>
            <input required type="number" min="0" step="0.0001" value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
              className="w-full px-3 py-2 text-sm border-[0.5px] border-neutral-300 rounded" />
          </div>
          {lineTotal && (
            <div className="flex justify-between text-sm px-1">
              <span className="text-neutral-500">Line Total</span>
              <span className="font-semibold">{invoice.currency} {Number(lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 border-[0.5px] border-red-200 rounded px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Adding…' : 'Add Line'}</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
