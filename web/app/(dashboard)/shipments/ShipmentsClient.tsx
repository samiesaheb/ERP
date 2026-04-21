'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ComboBox from '@/components/ui/ComboBox';
import SlideOver from '@/components/ui/SlideOver';
import { clientFetch } from '@/lib/client-api';
import { updateShipmentStatus } from '@/lib/mutations';
import type { SalesOrder, Shipment } from '@/lib/types';

type ShipmentRow = Shipment & { so_label: string };

function statusVariant(s: string): 'gray' | 'amber' | 'blue' | 'green' {
  if (s === 'loading')    return 'gray';
  if (s === 'dispatched') return 'amber';
  if (s === 'in_transit') return 'blue';
  if (s === 'delivered')  return 'green';
  return 'gray';
}

const COLUMNS: Column<ShipmentRow>[] = [
  { key: 'shipment_number', header: 'Shipment #', sortable: true },
  { key: 'so_label',        header: 'Sales Order' },
  { key: 'carrier',         header: 'Carrier',   render: (r) => r.carrier ?? '—' },
  { key: 'tracking_number', header: 'Tracking',  render: (r) => r.tracking_number ?? '—' },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
  },
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
];

export default function ShipmentsClient({
  shipments,
  salesOrders,
  soMap,
  initialSalesOrderId,
}: {
  shipments: Shipment[];
  salesOrders?: SalesOrder[];
  soMap?: Record<string, string>;
  initialSalesOrderId?: string;
}) {
  const router = useRouter();
  const availableSalesOrders = salesOrders ?? [];
  const salesOrderMap = soMap ?? Object.fromEntries(
    availableSalesOrders.map((salesOrder) => [salesOrder.id, salesOrder.order_number]),
  );
  const [open, setOpen] = useState(Boolean(initialSalesOrderId));
  const [form, setForm] = useState({
    sales_order_id: initialSalesOrderId ?? '',
    carrier:        '',
    tracking_number: '',
    notes:          '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const rows: ShipmentRow[] = shipments.map((s) => ({
    ...s,
    so_label: salesOrderMap[s.sales_order_id] ?? s.sales_order_id,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/api/v1/shipments', { method: 'POST', body: JSON.stringify(form) });
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
          columns={COLUMNS}
          toolbar={<Button onClick={() => setOpen(true)}>+ New Shipment</Button>}
          data={rows}
          onRowClick={(row) => router.push(`/shipments/${row.id}`)}
          actions={(row) => {
            const next: Record<string, string> = {
              loading: 'dispatched', dispatched: 'in_transit', in_transit: 'delivered',
            };
            const nextStatus = next[row.status];
            const statusLabel: Record<string, string> = {
              dispatched: 'Mark Dispatched', in_transit: 'Mark In Transit', delivered: 'Mark Delivered',
            };
            return [
              { label: 'View Details', onClick: () => router.push(`/shipments/${row.id}`) },
              ...(nextStatus ? [{
                label: statusLabel[nextStatus],
                onClick: () => updateShipmentStatus(row.id, nextStatus).then(() => router.refresh()),
              }] : []),
            ];
          }}
        />
      </div>

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Shipment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Sales Order</label>
            <ComboBox
              required
              value={form.sales_order_id}
              onChange={(v) => setForm({ ...form, sales_order_id: v })}
              options={availableSalesOrders.map((s) => ({ value: s.id, label: s.order_number }))}
              placeholder="Select…"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Carrier</label>
            <input
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              value={form.carrier}
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Tracking Number</label>
            <input
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
              value={form.tracking_number}
              onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
            />
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
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Shipment'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </SlideOver>
    </>
  );
}
