import { getManufacturingOrder, getMoBatches, getSalesOrders, getItems, getUoms } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Badge, { moStatusVariant, batchStatusVariant } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Link from 'next/link';
import StatusPanel from './StatusPanel';
import MoBatchesClient from './MoBatchesClient';

function fmt(v: string | null | undefined) {
  return v ? new Date(v).toLocaleDateString() : '—';
}

export default async function MoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mo, batches, sos, items, uoms] = await Promise.all([
    getManufacturingOrder(id),
    getMoBatches(id),
    getSalesOrders(),
    getItems(),
    getUoms(),
  ]);

  const soMap   = Object.fromEntries(sos.map((s) => [s.id, s.order_number]));
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.item_code} — ${i.description}`]));
  const uomMap  = Object.fromEntries(uoms.map((u) => [u.id, u.code]));

  return (
    <div>
      <Topbar
        title={mo.mo_number}
        action={
          <Link href="/manufacturing-orders" className="text-xs text-neutral-500 hover:text-neutral-700">
            ← Back
          </Link>
        }
      />
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Details card */}
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Details</p>
            </CardHeader>
            <CardBody className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Sales Order</span>
                <span className="font-medium">{mo.sales_order_id ? soMap[mo.sales_order_id] : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Finished Good</span>
                <span className="text-right">{itemMap[mo.item_id] ?? mo.item_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Planned Qty</span>
                <span className="tabular-nums font-medium">
                  {Number(mo.qty_planned).toLocaleString()} {uomMap[mo.uom_id] ?? ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Produced</span>
                <span className="tabular-nums">{Number(mo.qty_produced).toLocaleString()}</span>
              </div>
              {mo.notes && (
                <div className="pt-1 text-neutral-500 text-xs">{mo.notes}</div>
              )}
            </CardBody>
          </Card>

          {/* Schedule card */}
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Schedule</p>
            </CardHeader>
            <CardBody className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Planned Start</span>
                <span>{fmt(mo.planned_start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Planned End</span>
                <span>{fmt(mo.planned_end)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Actual Start</span>
                <span>{fmt(mo.actual_start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Actual End</span>
                <span>{fmt(mo.actual_end)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Created</span>
                <span>{fmt(mo.created_at)}</span>
              </div>
            </CardBody>
          </Card>

          {/* Status card */}
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</p>
            </CardHeader>
            <CardBody className="text-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Status</span>
                <Badge variant={moStatusVariant(mo.status)}>{mo.status}</Badge>
              </div>
              <StatusPanel moId={mo.id} status={mo.status} />
              <div className="flex justify-between">
                <span className="text-neutral-500">Batches</span>
                <span className="font-medium">{batches.length}</span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Batches */}
        <MoBatchesClient moId={mo.id} batches={batches} uomMap={uomMap} />
      </div>
    </div>
  );
}
