'use client';

import { usePathname, useRouter } from 'next/navigation';

type BadgeType = 'ok' | 'warn' | 'crit' | 'neu';
type AlertState = 'crit' | 'warn' | null;

interface Module {
  name: string;
  href: string;
  count: string;
  badge: { label: string; type: BadgeType };
  alert?: AlertState;
  paths: string[];          // SVG paths (16px viewBox, no fill, stroke)
  filled?: string[];        // SVG paths that should be filled
}

const BADGE_CLASSES: Record<BadgeType, string> = {
  ok:   'bg-green-100 text-green-700',
  warn: 'bg-amber-100 text-amber-700',
  crit: 'bg-red-100   text-red-600',
  neu:  'bg-neutral-100 text-neutral-500',
};

function ModIcon({ paths, filled, active }: { paths: string[]; filled?: string[]; active: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
      active ? 'bg-blue-100' : 'bg-neutral-100'
    }`}>
      <svg
        width="14" height="14" viewBox="0 0 16 16" fill="none"
        stroke={active ? '#2563eb' : '#9ca3af'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      >
        {paths.map((d, i) => <path key={i} d={d} />)}
        {filled?.map((d, i) => (
          <path key={`f${i}`} d={d} fill={active ? '#2563eb' : '#9ca3af'} stroke="none" />
        ))}
      </svg>
    </div>
  );
}

interface ModuleNavProps {
  lowStockCount?: number;
  openSOs?: number;
  activeMOs?: number;
}

export default function ModuleNav({ lowStockCount = 0, openSOs = 0, activeMOs = 0 }: ModuleNavProps) {
  const pathname = usePathname();
  const router   = useRouter();

  const MODULES: Module[] = [
    {
      name:  'Production',
      href:  '/manufacturing-orders',
      count: activeMOs > 0 ? `${activeMOs} active batch${activeMOs !== 1 ? 'es' : ''}` : 'No active batches',
      badge: activeMOs > 0 ? { label: `${activeMOs} running`, type: 'warn' } : { label: 'Idle', type: 'neu' },
      alert: activeMOs > 5 ? 'crit' : activeMOs > 0 ? 'warn' : null,
      paths: ['M2 6h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6z', 'M5 6V4a3 3 0 016 0v2'],
      filled: ['M7 9.5a1 1 0 102 0 1 1 0 00-2 0z'],
    },
    {
      name:  'QC Testing',
      href:  '/production',
      count: '6 tests pending',
      badge: { label: '1 on hold', type: 'warn' },
      alert: 'warn',
      paths: ['M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5 8 2z'],
    },
    {
      name:  'Inventory',
      href:  '/inventory',
      count: lowStockCount > 0 ? `${lowStockCount} low-stock items` : 'All stocked',
      badge: lowStockCount > 1
        ? { label: `${lowStockCount} reorder`, type: 'crit' }
        : lowStockCount === 1
        ? { label: '1 reorder', type: 'warn' }
        : { label: 'Healthy', type: 'ok' },
      alert: lowStockCount > 1 ? 'crit' : lowStockCount === 1 ? 'warn' : null,
      paths: [
        'M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z',
      ],
    },
    {
      name:  'Formulations',
      href:  '/bom',
      count: 'BOMs & recipes',
      badge: { label: '3 pending', type: 'warn' },
      alert: null,
      paths: ['M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z', 'M6 6h4M6 9h4M6 12h2'],
    },
    {
      name:  'Orders',
      href:  '/sales-orders',
      count: openSOs > 0 ? `${openSOs} open orders` : 'No open orders',
      badge: { label: 'On schedule', type: 'ok' },
      alert: null,
      paths: ['M2 3h12v2H2zM2 7h12v2H2zM2 11h8v2H2z'],
    },
    {
      name:  'Suppliers',
      href:  '/suppliers',
      count: 'Active suppliers',
      badge: { label: 'No alerts', type: 'neu' },
      alert: null,
      paths: ['M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6'],
      filled: ['M5 5a3 3 0 106 0 3 3 0 00-6 0z'],
    },
    {
      name:  'Reports',
      href:  '/invoicing',
      count: 'Batch records, yield, QC',
      badge: { label: 'Export ready', type: 'neu' },
      alert: null,
      paths: ['M2 12l4-4 3 3 5-7'],
    },
    {
      name:  'FormulAI',
      href:  '/bom',
      count: 'AI formulation assistant',
      badge: { label: 'Phase 5', type: 'neu' },
      alert: null,
      paths: ['M8 2v2M8 12v2M2 8h2M12 8h2M4.22 4.22l1.42 1.42M10.36 10.36l1.42 1.42M4.22 11.78l1.42-1.42M10.36 5.64l1.42-1.42'],
      filled: ['M6 8a2 2 0 104 0 2 2 0 00-4 0z'],
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {MODULES.map((mod) => {
        const active = pathname === mod.href || pathname.startsWith(mod.href + '/');
        const stateClass = active ? 'mod-active' : mod.alert === 'crit' ? 'mod-crit' : mod.alert === 'warn' ? 'mod-warn' : '';

        return (
          <button
            key={mod.name}
            type="button"
            onClick={() => router.push(mod.href)}
            className={`spring-card text-left bg-white border-[0.5px] border-neutral-200 rounded-[14px] px-4 py-4
                        flex flex-col gap-1.5 cursor-pointer ${stateClass}`}
          >
            <ModIcon paths={mod.paths} filled={mod.filled} active={active} />
            <p className={`text-[13px] font-medium leading-tight ${active ? 'text-blue-700' : 'text-neutral-900'}`}>
              {mod.name}
            </p>
            <p className="text-[11px] text-neutral-400 leading-tight">{mod.count}</p>
            <span className={`self-start text-[10px] font-medium px-1.5 py-0.5 rounded-md ${BADGE_CLASSES[mod.badge.type]}`}>
              {mod.badge.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
