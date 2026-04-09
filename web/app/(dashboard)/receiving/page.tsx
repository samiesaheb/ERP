import { getPurchaseOrders, getReceipts, getSuppliers, getItems, getUoms } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import ReceivingClient from './ReceivingClient';

const RECEIVABLE = new Set(['confirmed', 'partially_received']);

export default async function ReceivingPage() {
  const [pos, receipts, suppliers, items, uoms] = await Promise.all([
    getPurchaseOrders(),
    getReceipts(),
    getSuppliers(),
    getItems(),
    getUoms(),
  ]);
  const openPos = pos.filter((p) => RECEIVABLE.has(p.status));
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  const poMap       = Object.fromEntries(pos.map((p) => [p.id, p.po_number]));
  return (
    <div>
      <Topbar title="Goods Receiving (GRN)" />
      <div className="px-6 py-5">
        <ReceivingClient
          openPos={openPos}
          receipts={receipts}
          supplierMap={supplierMap}
          poMap={poMap}
          items={items}
          uoms={uoms}
        />
      </div>
    </div>
  );
}
