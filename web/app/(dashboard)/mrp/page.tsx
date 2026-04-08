import {
  getItems,
  getManufacturingOrders,
  getProductionPlans,
  getPurchaseOrders,
  getSalesOrders,
  getUoms,
} from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import MrpClient from './MrpClient';

export default async function MrpPage() {
  const [plans, mos, purchaseOrders, salesOrders, items, uoms] = await Promise.all([
    getProductionPlans(),
    getManufacturingOrders(),
    getPurchaseOrders(),
    getSalesOrders(),
    getItems(),
    getUoms(),
  ]);

  return (
    <div>
      <Topbar title="MRP & Planning" />
      <div className="px-6 py-5">
        <MrpClient
          plans={plans}
          mos={mos}
          purchaseOrders={purchaseOrders}
          salesOrders={salesOrders}
          items={items}
          uoms={uoms}
        />
      </div>
    </div>
  );
}