import { getManufacturingOrders, getSalesOrders, getItems } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import MoClient from './MoClient';

export default async function ManufacturingOrdersPage() {
  const [mos, sos, items] = await Promise.all([
    getManufacturingOrders(),
    getSalesOrders(),
    getItems(),
  ]);
  const soMap = Object.fromEntries(sos.map((s) => [s.id, s.order_number]));
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.code} — ${i.description}`]));
  return (
    <div>
      <Topbar title="Manufacturing Orders" />
      <div className="px-6 py-5">
        <MoClient mos={mos} soMap={soMap} itemMap={itemMap} salesOrders={sos} items={items} />
      </div>
    </div>
  );
}
