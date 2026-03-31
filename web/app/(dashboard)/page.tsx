import { getDashboard, getSalesOrders, getInventory } from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import KpiCard from '@/components/ui/KpiCard';
import Badge, { soStatusVariant } from '@/components/ui/Badge';
import type { DashboardData, SalesOrder, InventoryWithAlert } from '@/lib/types';

function fmt(val: string | number) {
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function PipelineStrip({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {data.pipeline.map((stage) => (
        <div key={stage.stage} className="bg-white border-[0.5px] border-neutral-200 rounded-lg px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 truncate">
            {stage.stage}
          </p>
          <p className="mt-1 text-xl font-semibold text-neutral-900 tabular-nums">{stage.count}</p>
          <div className="mt-2 h-1 rounded-full bg-neutral-100">
            <div
              className="h-1 rounded-full bg-neutral-700 transition-all"
              style={{ width: `${stage.fill_pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentSoTable({ orders }: { orders: SalesOrder[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-[0.5px] border-neutral-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">SO #</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Pieces</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.slice(0, 8).map((so) => (
            <tr key={so.id} className="border-b-[0.5px] border-neutral-100 hover:bg-neutral-50">
              <td className="px-3 py-2.5 font-mono text-xs text-neutral-700">{so.order_number}</td>
              <td className="px-3 py-2.5 tabular-nums text-neutral-700">{fmt(so.total_pieces)}</td>
              <td className="px-3 py-2.5">
                <Badge variant={soStatusVariant(so.status)}>{so.status}</Badge>
              </td>
              <td className="px-3 py-2.5 text-neutral-500 text-xs">
                {new Date(so.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryAlerts({ items }: { items: InventoryWithAlert[] }) {
  const alerts = items.filter((i) => i.low_stock);
  return (
    <div className="space-y-1.5">
      {alerts.length === 0 && (
        <p className="text-sm text-neutral-400 py-4 text-center">No low-stock items</p>
      )}
      {alerts.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between px-3 py-2 bg-red-50
                     border-[0.5px] border-red-200 rounded"
        >
          <div>
            <p className="text-sm font-medium text-neutral-800">{item.item_code}</p>
            <p className="text-xs text-neutral-500">{item.item_description}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-red-700">{fmt(item.qty_available)}</p>
            <p className="text-[10px] text-neutral-400">available</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const [dashboard, recentSOs, inventory] = await Promise.all([
    getDashboard(),
    getSalesOrders(),
    getInventory(),
  ]);

  return (
    <div>
      <Topbar title="Dashboard" />
      <div className="px-6 py-5 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            label="Open Sales Orders"
            value={dashboard.kpis.open_sales_orders}
            accent="blue"
          />
          <KpiCard
            label="Active Mfg Orders"
            value={dashboard.kpis.active_manufacturing_orders}
            accent="amber"
          />
          <KpiCard
            label="Open Purchase Orders"
            value={dashboard.kpis.open_purchase_orders}
            accent="purple"
          />
          <KpiCard
            label="Pending Invoices"
            value={`$${fmt(dashboard.kpis.pending_invoices_value)}`}
            accent="red"
          />
        </div>

        {/* Pipeline strip */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
            Production Pipeline
          </h2>
          <PipelineStrip data={dashboard} />
        </div>

        {/* Lower two-column section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Recent SOs */}
          <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b-[0.5px] border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-800">Recent Sales Orders</h3>
            </div>
            <RecentSoTable orders={recentSOs} />
          </div>

          {/* Inventory alerts */}
          <div className="bg-white border-[0.5px] border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b-[0.5px] border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-800">Low Stock Alerts</h3>
            </div>
            <div className="px-4 py-4">
              <InventoryAlerts items={inventory} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
