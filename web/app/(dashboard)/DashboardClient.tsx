'use client';

import { useRouter } from 'next/navigation';
import KpiCard from '@/components/ui/KpiCard';
import Badge, { soStatusVariant } from '@/components/ui/Badge';
import DropdownMenu from '@/components/ui/DropdownMenu';
import SwipeCard from '@/components/ui/SwipeCard';
import type { DashboardData, SalesOrder, InventoryWithItem } from '@/lib/types';

function fmt(val: string | number) {
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const STAGE_HREF: Record<string, string> = {
  'Sales Order':      '/sales-orders',
  'Mfg Order':        '/manufacturing-orders',
  'Bulk Production':  '/production',
  'Filling':          '/production',
  'Packing':          '/production',
  'Loading':          '/shipments',
};

/* ── Pipeline ─────────────────────────────────────────────────────── */
function PipelineCard({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const max = Math.max(...data.pipeline.map((s) => s.count), 1);
  return (
    <div className="bg-white rounded-xl h-full flex flex-col">
      <div className="px-5 py-4 border-b-[0.5px] border-neutral-100 flex items-center gap-2">
        <DropdownMenu align="left" items={[
          { label: 'View All MOs', onClick: () => router.push('/manufacturing-orders') },
          { label: 'Refresh',      onClick: () => router.refresh() },
        ]} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Production Pipeline</p>
      </div>
      <div className="flex-1 px-5 pb-4 pt-3">
        <div className="grid grid-cols-6 gap-3 h-full">
          {data.pipeline.map((stage) => (
            <button
              key={stage.stage}
              onClick={() => router.push(STAGE_HREF[stage.stage] ?? '/')}
              className="flex flex-col justify-between text-left group hover:opacity-80 transition-opacity"
            >
              <div className="flex-1 flex items-end mb-2 w-full">
                <div className="w-full bg-neutral-100 rounded overflow-hidden" style={{ height: '64px' }}>
                  <div
                    className="w-full bg-neutral-800 rounded transition-all duration-500 group-hover:bg-neutral-600"
                    style={{ height: `${(stage.count / max) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-xl font-bold text-neutral-900 tabular-nums leading-none">{stage.count}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400 mt-1 truncate group-hover:text-neutral-600">
                {stage.stage}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Recent SOs ───────────────────────────────────────────────────── */
function RecentSoCard({ orders }: { orders: SalesOrder[] }) {
  const router = useRouter();
  return (
    <div className="spring-card bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b-[0.5px] border-neutral-100 flex items-center gap-2">
        <DropdownMenu align="left" items={[
          { label: 'View All',   onClick: () => router.push('/sales-orders') },
          { label: 'Export CSV', onClick: () => router.push('/sales-orders') },
        ]} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Recent Sales Orders</p>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-b-[0.5px] border-neutral-100">
              <th className="w-10 px-2 py-2.5" />
              <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-400">SO #</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-400">Pieces</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-400">Status</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-400">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 8).map((so) => (
              <tr
                key={so.id}
                onClick={() => router.push(`/sales-orders/${so.id}`)}
                className="border-b-[0.5px] border-neutral-50 hover:bg-neutral-50 transition-colors group cursor-pointer"
              >
                <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-start">
                    <DropdownMenu align="left" items={[
                      { label: 'View Order',   onClick: () => router.push(`/sales-orders/${so.id}`) },
                      { label: 'Edit',         onClick: () => router.push(`/sales-orders/${so.id}`) },
                      { label: 'Cancel Order', onClick: () => router.push(`/sales-orders/${so.id}`), variant: 'danger' },
                    ]} />
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-neutral-700 font-medium">{so.order_number}</td>
                <td className="px-5 py-3 tabular-nums text-sm text-neutral-700">{so.total_pieces ? fmt(so.total_pieces) : '—'}</td>
                <td className="px-5 py-3"><Badge variant={soStatusVariant(so.status)}>{so.status}</Badge></td>
                <td className="px-5 py-3 text-neutral-400 text-xs">{new Date(so.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Low Stock Alerts ─────────────────────────────────────────────── */
function LowStockCard({ items }: { items: InventoryWithItem[] }) {
  const router = useRouter();
  const alerts = items.filter((i) => i.reorder_alert);
  return (
    <div className="bg-white rounded-xl overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b-[0.5px] border-neutral-100 flex items-center gap-2">
        <DropdownMenu align="left" items={[
          { label: 'View All Inventory', onClick: () => router.push('/inventory') },
          { label: 'Export',             onClick: () => router.push('/inventory') },
        ]} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Low Stock</p>
        {alerts.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
            {alerts.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {alerts.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-xs text-neutral-400">All stocked up</p>
            </div>
          </div>
        ) : (
          alerts.map((item) => (
            <SwipeCard
              key={item.id}
              className="rounded-lg"
              actions={[
                { label: 'View',      onClick: () => router.push('/inventory'),       variant: 'primary' },
                { label: 'Create PO', onClick: () => router.push('/purchase-orders'), variant: 'dark' },
              ]}
            >
              <div className="flex items-center justify-between px-3 py-2.5 bg-red-50 border-[0.5px] border-red-100 rounded-lg group">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-800 font-mono">{item.item_code}</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">{item.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600 tabular-nums">{fmt(item.qty_available)}</p>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wide">avail</p>
                  </div>
                </div>
              </div>
            </SwipeCard>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────── */
export default function DashboardClient({
  dashboard,
  recentSOs,
  inventory,
}: {
  dashboard: DashboardData;
  recentSOs: SalesOrder[];
  inventory: InventoryWithItem[];
}) {
  const router = useRouter();

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-12 gap-3">

        <div className="col-span-3">
          <SwipeCard
            className="border-[0.5px] border-neutral-200 rounded-xl h-full"
            actions={[
              { label: 'View All', sublabel: 'SOs',   onClick: () => router.push('/sales-orders'),       variant: 'primary' },
              { label: 'New SO',                      onClick: () => router.push('/sales-orders?new=1'), variant: 'dark' },
            ]}
          >
            <KpiCard
              label="Open Sales Orders"
              value={dashboard.kpis.open_sales_orders}
              accent="blue"
              menuItems={[
                { label: 'View All SOs',    onClick: () => router.push('/sales-orders') },
                { label: 'New Sales Order', onClick: () => router.push('/sales-orders?new=1') },
              ]}
            />
          </SwipeCard>
        </div>

        <div className="col-span-3">
          <SwipeCard
            className="border-[0.5px] border-neutral-200 rounded-xl h-full"
            actions={[
              { label: 'View All', sublabel: 'MOs',  onClick: () => router.push('/manufacturing-orders'),       variant: 'primary' },
              { label: 'New MO',                     onClick: () => router.push('/manufacturing-orders?new=1'), variant: 'dark' },
            ]}
          >
            <KpiCard
              label="Active Mfg Orders"
              value={dashboard.kpis.active_manufacturing_orders}
              accent="amber"
              menuItems={[
                { label: 'View All MOs',  onClick: () => router.push('/manufacturing-orders') },
                { label: 'New Mfg Order', onClick: () => router.push('/manufacturing-orders?new=1') },
              ]}
            />
          </SwipeCard>
        </div>

        <div className="col-span-3">
          <SwipeCard
            className="border-[0.5px] border-neutral-200 rounded-xl h-full"
            actions={[
              { label: 'View All', sublabel: 'POs', onClick: () => router.push('/purchase-orders'),       variant: 'primary' },
              { label: 'New PO',                    onClick: () => router.push('/purchase-orders?new=1'), variant: 'dark' },
            ]}
          >
            <KpiCard
              label="Open Purchase Orders"
              value={dashboard.kpis.open_purchase_orders}
              accent="purple"
              menuItems={[
                { label: 'View All POs',       onClick: () => router.push('/purchase-orders') },
                { label: 'New Purchase Order', onClick: () => router.push('/purchase-orders?new=1') },
              ]}
            />
          </SwipeCard>
        </div>

        <div className="col-span-3">
          <SwipeCard
            className="border-[0.5px] border-neutral-200 rounded-xl h-full"
            actions={[
              { label: 'Invoices', sublabel: 'view all', onClick: () => router.push('/invoicing'),       variant: 'primary' },
              { label: 'New',      sublabel: 'invoice',  onClick: () => router.push('/invoicing?new=1'), variant: 'dark' },
            ]}
          >
            <KpiCard
              label="Pending Invoices"
              value={`$${fmt(dashboard.kpis.pending_invoices_value)}`}
              accent="red"
              menuItems={[
                { label: 'View All Invoices', onClick: () => router.push('/invoicing') },
                { label: 'New Invoice',       onClick: () => router.push('/invoicing?new=1') },
              ]}
            />
          </SwipeCard>
        </div>

        <div className="col-span-8" style={{ height: '180px' }}>
          <SwipeCard
            className="border-[0.5px] border-neutral-200 rounded-xl h-full"
            actions={[
              { label: 'View MOs', onClick: () => router.push('/manufacturing-orders'), variant: 'primary' },
              { label: 'Refresh',  onClick: () => router.refresh?.(),                   variant: 'dark' },
            ]}
          >
            <PipelineCard data={dashboard} router={router} />
          </SwipeCard>
        </div>

        <div className="col-span-4 row-span-2">
          <LowStockCard items={inventory} />
        </div>

        <div className="col-span-8">
          <RecentSoCard orders={recentSOs} />
        </div>

      </div>
    </div>
  );
}
