import { getWorkCenters } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import WorkCentersClient from './WorkCentersClient';

export default async function WorkCentersPage() {
  const workCenters = await getWorkCenters();
  return (
    <div>
      <Topbar title="Work Centers" />
      <div className="px-6 py-5">
        <WorkCentersClient workCenters={workCenters} />
      </div>
    </div>
  );
}
