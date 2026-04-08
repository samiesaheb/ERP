import { getShipments, getSalesOrders } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import ShipmentsClient from './ShipmentsClient';

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ createFor?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const [shipments, sos] = await Promise.all([getShipments(), getSalesOrders()]);
  const soMap = Object.fromEntries(sos.map((salesOrder) => [salesOrder.id, salesOrder.order_number]));

  return (
    <div>
      <Topbar title="Shipments" />
      <div className="px-6 py-5">
        <ShipmentsClient
          shipments={shipments}
          salesOrders={sos}
          soMap={soMap}
          initialSalesOrderId={params?.createFor}
        />
      </div>
    </div>
  );
}
