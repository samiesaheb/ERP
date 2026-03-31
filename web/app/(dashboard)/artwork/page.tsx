import { getSalesOrders } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import ArtworkClient from './ArtworkClient';

export default async function ArtworkPage() {
  const orders = await getSalesOrders();
  const artworkOrders = orders.filter((o) => o.status === 'artwork' || o.artwork_status !== 'approved');

  return (
    <div>
      <Topbar title="Artwork & FDA" />
      <div className="px-6 py-5">
        <ArtworkClient orders={artworkOrders} />
      </div>
    </div>
  );
}
