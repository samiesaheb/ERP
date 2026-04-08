import { getArtworks, getSalesOrders, getItems } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import ArtworkClient from './ArtworkClient';

export default async function ArtworkPage() {
  const [artworks, salesOrders, items] = await Promise.all([
    getArtworks(),
    getSalesOrders(),
    getItems(),
  ]);

  return (
    <div>
      <Topbar title="Artwork & FDA" />
      <div className="px-6 py-5">
        <ArtworkClient artworks={artworks} salesOrders={salesOrders} items={items} />
      </div>
    </div>
  );
}
