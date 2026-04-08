import { getInventory, getItems } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const [inventory, items] = await Promise.all([getInventory(), getItems()]);
  return (
    <div>
      <Topbar title="Inventory" />
      <div className="px-6 py-5">
        <InventoryClient inventory={inventory} items={items} />
      </div>
    </div>
  );
}
