import { getManufacturingOrder, getSalesOrders, getItems } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Badge, { moStatusVariant } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import Link from 'next/link';

export default async function MoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mo, sos, items] = await Promise.all([
    getManufacturingOrder(id),
    getSalesOrders(),
    getItems(),
  ]);
  const soMap = Object.fromEntries(sos.map((s) => [s.id, s.order_number]));
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.code} — ${i.description}`]));

  return (
    <div>
      <Topbar
        title={mo.mo_number}
        action={<Link href="/manufacturing-orders" className="text-xs text-neutral-500 hover:text-neutral-700">← Back</Link>}
      />
      <div className="px-6 py-5 grid grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-neutral-500">Sales Order</span><span className="font-medium">{soMap[mo.sales_order_id]}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Finished Good</span><span>{itemMap[mo.item_id]}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Target Qty</span><span className="tabular-nums font-medium">{Number(mo.target_qty).toLocaleString()}</span></div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Status</span>
              <Badge variant={moStatusVariant(mo.status)}>{mo.status}</Badge>
            </div>
            <div className="flex justify-between"><span className="text-neutral-500">Created</span><span>{new Date(mo.created_at).toLocaleDateString()}</span></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
