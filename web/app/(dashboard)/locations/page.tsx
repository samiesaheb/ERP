import { getLocations } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import LocationsClient from './LocationsClient';

export default async function LocationsPage() {
  const locations = await getLocations();
  return (
    <div>
      <Topbar title="Warehouse Locations" />
      <div className="px-6 py-5">
        <LocationsClient locations={locations} />
      </div>
    </div>
  );
}
