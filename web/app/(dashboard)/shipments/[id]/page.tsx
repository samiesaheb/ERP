import {
  getShipment,
  getShipmentLines,
  getShippingDocuments,
  getSalesOrders,
  getItems,
  getUoms,
  getProductionBatches,
} from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';
import ShipmentDetailClient from './ShipmentDetailClient';

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [shipment, lines, documents, salesOrders, items, uoms, batches] = await Promise.all([
    getShipment(id),
    getShipmentLines(id),
    getShippingDocuments(id),
    getSalesOrders(),
    getItems(),
    getUoms(),
    getProductionBatches(),
  ]);

  const soMap   = Object.fromEntries(salesOrders.map((s) => [s.id, s.order_number]));
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.item_code} — ${i.description}`]));
  const uomMap  = Object.fromEntries(uoms.map((u) => [u.id, u.code]));

  // Only completed batches can be shipped
  const completedBatches = batches.filter((b) => b.status === 'completed');

  return (
    <div>
      <Topbar
        title={shipment.shipment_number}
        action={
          <Link href="/shipments" className="text-xs text-neutral-500 hover:text-neutral-700">
            ← Back to Shipments
          </Link>
        }
      />
      <div className="px-6 py-5">
        <ShipmentDetailClient
          shipment={shipment}
          lines={lines}
          documents={documents}
          soMap={soMap}
          items={items}
          itemMap={itemMap}
          uoms={uoms}
          uomMap={uomMap}
          batches={completedBatches}
        />
      </div>
    </div>
  );
}
