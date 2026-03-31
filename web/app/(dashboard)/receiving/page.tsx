import { getPurchaseOrders, getSuppliers } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import ReceivingClient from './ReceivingClient';

export default async function ReceivingPage() {
  const [pos, suppliers] = await Promise.all([
    getPurchaseOrders({ status: 'ordered' }),
    getSuppliers(),
  ]);
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  return (
    <div>
      <Topbar title="Goods Receiving (GRN)" />
      <div className="px-6 py-5">
        <ReceivingClient openPos={pos} supplierMap={supplierMap} />
      </div>
    </div>
  );
}
