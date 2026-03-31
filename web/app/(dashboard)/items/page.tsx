import { getItems, getUoms } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import ItemsClient from './ItemsClient';

export default async function ItemsPage() {
  const [items, uoms] = await Promise.all([getItems(), getUoms()]);
  const uomMap = Object.fromEntries(uoms.map((u) => [u.id, u.code]));
  return (
    <div>
      <Topbar title="Item Master" />
      <div className="px-6 py-5">
        <ItemsClient items={items} uomMap={uomMap} uoms={uoms} />
      </div>
    </div>
  );
}
