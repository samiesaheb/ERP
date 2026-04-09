import { getInventory, getInventoryTxns, getItems, getUoms } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const [inventory, transactions, items, uoms] = await Promise.all([
    getInventory(),
    getInventoryTxns(),
    getItems(),
    getUoms(),
  ]);
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.item_code} — ${i.description}`]));
  const uomMap  = Object.fromEntries(uoms.map((u) => [u.id, u.code]));
  return (
    <div>
      <Topbar title="Inventory" />
      <div className="px-6 py-5">
        <InventoryClient
          inventory={inventory}
          transactions={transactions}
          items={items}
          itemMap={itemMap}
          uomMap={uomMap}
        />
      </div>
    </div>
  );
}
