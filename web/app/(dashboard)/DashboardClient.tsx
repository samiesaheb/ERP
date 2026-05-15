'use client';

import { useRouter } from 'next/navigation';
import Badge, { soStatusVariant } from '@/components/ui/Badge';
import DropdownMenu from '@/components/ui/DropdownMenu';
import SwipeCard from '@/components/ui/SwipeCard';
import { useAppPrefs } from '@/contexts/AppPrefsContext';
import type { DashboardData, SalesOrder, InventoryWithItem } from '@/lib/types';

function fmt(val: string | number) {
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const STAGE_HREF: Record<string, string> = {
  'Sales Order':     '/sales-orders',
  'Mfg Order':       '/manufacturing-orders',
  'Bulk Production': '/production',
  'Filling':         '/production',
  'Packing':         '/production',
  'Loading':         '/shipments',
};

const ACCENT_TOP: Record<string, string> = {
  blue:   'border-t-[3px] border-t-blue-500',
  amber:  'border-t-[3px] border-t-amber-500',
  purple: 'border-t-[3px] border-t-purple-500',
  red:    'border-t-[3px] border-t-red-500',
};

const ACCENT_TEXT: Record<string, string> = {
  blue:   'text-blue-600',
  amber:  'text-amber-600',
  purple: 'text-purple-600',
  red:    'text-red-600',
};

/* ── KPI Card ──────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, accent = 'blue', onClick, menuItems,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'blue' | 'amber' | 'purple' | 'red';
  onClick?: () => void;
  menuItems?: { label: string; onClick: () => void }[];
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden flex flex-col
                  ${ACCENT_TOP[accent]} ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
    >
      <div className="px-5 pt-4 pb-5 flex-1 flex flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 leading-tight">
            {label}
          </p>
          {menuItems && (
            <DropdownMenu items={menuItems} align="right" triggerClassName="-mr-1 -mt-0.5 shrink-0" />
          )}
        </div>
        <div>
          <p className={`text-4xl font-bold tabular-nums leading-none ${ACCENT_TEXT[accent]}`}>
            {value}
          </p>
          {sub && <p className="mt-1.5 text-xs text-neutral-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Pipeline ─────────────────────────────────────────────────────── */
function PipelineCard({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const { t } = useAppPrefs();
  const max = Math.max(...data.pipeline.map((s) => s.count), 1);
  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="px-5 py-3.5 border-b-[0.5px] border-neutral-100 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          {t('Production Pipeline')}
        </p>
        <DropdownMenu align="right" items={[
          { label: 'View All MOs', onClick: () => router.push('/manufacturing-orders') },
          { label: 'Refresh',      onClick: () => router.refresh() },
        ]} />
      </div>
      <div className="flex-1 px-5 pb-5 pt-4">
        <div className="grid grid-cols-6 gap-4 h-full">
          {data.pipeline.map((stage) => (
            <button
              key={stage.stage}
              onClick={() => router.push(STAGE_HREF[stage.stage] ?? '/')}
              className="flex flex-col gap-2 text-left group hover:opacity-75 transition-opacity"
            >
              <div className="flex items-end w-full" style={{ height: '80px' }}>
                <div className="w-full bg-neutral-100 rounded-md overflow-hidden" style={{ height: '80px' }}>
                  <div
                    className="w-full bg-neutral-800 rounded-md transition-all duration-500 group-hover:bg-neutral-600"
                    style={{ height: `${Math.max((stage.count / max) * 100, stage.count > 0 ? 6 : 0)}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 tabular-nums leading-none">{stage.count}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400 mt-0.5 truncate group-hover:text-neutral-600">
                  {stage.stage}
                </p>
              </div>
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
  const { t } = useAppPrefs();
  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b-[0.5px] border-neutral-100 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          {t('Recent Sales Orders')}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/sales-orders')}
            className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors font-medium"
          >
            View all →
          </button>
          <DropdownMenu align="right" items={[
            { label: 'View All',   onClick: () => router.push('/sales-orders') },
            { label: 'Export CSV', onClick: () => router.push('/sales-orders') },
          ]} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-[0.5px] border-neutral-100 bg-neutral-50">
              <th className="w-10 px-3 py-2.5" />
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{t('SO #')}</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{t('Customer')}</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{t('Pieces')}</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{t('Status')}</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-400">{t('Date')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 8).map((so) => (
              <tr
                key={so.id}
                onClick={() => router.push(`/sales-orders/${so.id}`)}
                className="border-b-[0.5px] border-neutral-50 hover:bg-neutral-50 transition-colors group cursor-pointer"
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu align="left" items={[
                      { label: 'View Order', onClick: () => router.push(`/sales-orders/${so.id}`) },
                      { label: 'Edit',       onClick: () => router.push(`/sales-orders/${so.id}`) },
                    ]} />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-800 font-semibold">{so.order_number}</td>
                <td className="px-4 py-3 text-xs text-neutral-500 max-w-[160px] truncate">{so.customer_id}</td>
                <td className="px-4 py-3 tabular-nums text-sm text-neutral-700">{so.total_pieces ? fmt(so.total_pieces) : '—'}</td>
                <td className="px-4 py-3"><Badge variant={soStatusVariant(so.status)}>{so.status}</Badge></td>
                <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{new Date(so.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-neutral-400">No orders yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Low Stock Alerts ─────────────────────────────────────────────── */
function LowStockCard({ items }: { items: InventoryWithItem[] }) {
  const router = useRouter();
  const { t } = useAppPrefs();
  const alerts = items.filter((i) => i.reorder_alert);
  return (
    <div className="bg-white border-[0.5px] border-neutral-200 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="px-5 py-3.5 border-b-[0.5px] border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{t('Low Stock')}</p>
          {alerts.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
              {alerts.length}
            </span>
          )}
        </div>
        <DropdownMenu align="right" items={[
          { label: 'View Inventory', onClick: () => router.push('/inventory') },
          { label: 'Create PO',      onClick: () => router.push('/purchase-orders') },
        ]} />
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-50">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-xs text-neutral-400">{t('All stocked up')}</p>
          </div>
        ) : (
          alerts.map((item) => (
            <SwipeCard
              key={item.id}
              actions={[
                { label: 'View',      onClick: () => router.push('/inventory'),       variant: 'primary' },
                { label: 'Create PO', onClick: () => router.push('/purchase-orders'), variant: 'dark' },
              ]}
            >
              <div className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-800 font-mono">{item.item_code}</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">{item.description}</p>
                </div>
                <div className="shrink-0 ml-3 text-right">
                  <p className="text-sm font-bold text-red-500 tabular-nums">{fmt(item.qty_available)}</p>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-wide">on hand</p>
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
  const { t, formatMoney } = useAppPrefs();

  return (
    <div className="px-6 py-5 space-y-4">

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label={t('Open Sales Orders')}
          value={dashboard.kpis.open_sales_orders}
          accent="blue"
          onClick={() => router.push('/sales-orders')}
          menuItems={[
            { label: 'View All SOs',    onClick: () => router.push('/sales-orders') },
            { label: 'New Sales Order', onClick: () => router.push('/sales-orders?new=1') },
          ]}
        />
        <KpiCard
          label={t('Active Mfg Orders')}
          value={dashboard.kpis.active_manufacturing_orders}
          accent="amber"
          onClick={() => router.push('/manufacturing-orders')}
          menuItems={[
            { label: 'View All MOs',  onClick: () => router.push('/manufacturing-orders') },
            { label: 'New Mfg Order', onClick: () => router.push('/manufacturing-orders?new=1') },
          ]}
        />
        <KpiCard
          label={t('Open Purchase Orders')}
          value={dashboard.kpis.open_purchase_orders}
          accent="purple"
          onClick={() => router.push('/purchase-orders')}
          menuItems={[
            { label: 'View All POs',       onClick: () => router.push('/purchase-orders') },
            { label: 'New Purchase Order', onClick: () => router.push('/purchase-orders?new=1') },
          ]}
        />
        <KpiCard
          label={t('Pending Invoices')}
          value={formatMoney(dashboard.kpis.pending_invoices_value)}
          accent="red"
          onClick={() => router.push('/invoicing')}
          menuItems={[
            { label: 'View All Invoices', onClick: () => router.push('/invoicing') },
            { label: 'New Invoice',       onClick: () => router.push('/invoicing?new=1') },
          ]}
        />
      </div>

      {/* Middle row: pipeline + low stock */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8" style={{ minHeight: '220px' }}>
          <PipelineCard data={dashboard} router={router} />
        </div>
        <div className="col-span-4" style={{ minHeight: '220px' }}>
          <LowStockCard items={inventory} />
        </div>
      </div>

      {/* Bottom row: recent SOs */}
      <RecentSoCard orders={recentSOs} />

    </div>
  );
}
