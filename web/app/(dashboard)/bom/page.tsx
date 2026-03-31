import { getBoms, getItems } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import BomClient from './BomClient';

export default async function BomPage() {
  const [boms, items] = await Promise.all([getBoms(), getItems()]);
  const itemMap = Object.fromEntries(items.map((i) => [i.id, `${i.code} — ${i.description}`]));

  return (
    <div>
      <Topbar title="Bill of Materials" />
      <div className="px-6 py-5">
        <BomClient boms={boms} itemMap={itemMap} />
      </div>
    </div>
  );
}
