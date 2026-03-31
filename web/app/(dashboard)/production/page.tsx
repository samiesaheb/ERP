import { getProductionBatches, getManufacturingOrders } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import ProductionFloorClient from './ProductionFloorClient';

export default async function ProductionPage() {
  const [batches, mos] = await Promise.all([getProductionBatches(), getManufacturingOrders()]);
  const moMap = Object.fromEntries(mos.map((m) => [m.id, m.mo_number]));
  return (
    <div>
      <Topbar title="Production Floor" />
      <div className="px-6 py-5">
        <ProductionFloorClient batches={batches} moMap={moMap} />
      </div>
    </div>
  );
}
