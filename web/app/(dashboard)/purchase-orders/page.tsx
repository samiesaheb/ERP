import { getPurchaseOrders, getSuppliers, getItems, getUoms, getManufacturingOrders } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import PurchaseOrdersClient from './PurchaseOrdersClient';

export default async function PurchaseOrdersPage() {
  const [orders, suppliers, items, uoms, mos] = await Promise.all([
    getPurchaseOrders(),
    getSuppliers(),
    getItems(),
    getUoms(),
    getManufacturingOrders(),
  ]);
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  return (
    <div>
      <Topbar title="Purchase Orders" />
      <div className="px-6 py-5">
        <PurchaseOrdersClient
          orders={orders}
          supplierMap={supplierMap}
          suppliers={suppliers}
          items={items}
          uoms={uoms}
          manufacturingOrders={mos}
        />
      </div>
    </div>
  );
}
