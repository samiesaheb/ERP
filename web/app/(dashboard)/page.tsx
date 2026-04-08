import { getDashboard, getSalesOrders, getInventory } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const [dashboard, recentSOs, inventory] = await Promise.all([
    getDashboard(),
    getSalesOrders(),
    getInventory(),
  ]);

  return (
    <div>
      <Topbar title="Dashboard" />
      <DashboardClient dashboard={dashboard} recentSOs={recentSOs} inventory={inventory} />
    </div>
  );
}
