'use client';

import DropdownMenu, { MenuItem } from './DropdownMenu';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'blue' | 'amber' | 'green' | 'red' | 'purple';
  menuItems?: MenuItem[];
}

const DOT: Record<string, string> = {
  blue:   'bg-blue-500',
  amber:  'bg-amber-500',
  green:  'bg-green-500',
  red:    'bg-red-500',
  purple: 'bg-purple-500',
};

export default function KpiCard({ label, value, sub, accent, menuItems }: KpiCardProps) {
  return (
    <div className="bg-white px-5 py-5 flex flex-col justify-between min-h-[110px] h-full">
      <div className="flex items-center gap-1.5 min-w-0">
        {menuItems && menuItems.length > 0 && (
          <DropdownMenu items={menuItems} align="left" triggerClassName="-ml-1 -mt-1 shrink-0" />
        )}
        {accent && <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${DOT[accent]}`} />}
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 truncate">
          {label}
        </p>
      </div>
      <div>
        <p className="text-3xl font-bold text-neutral-900 tabular-nums leading-none">
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-neutral-400">{sub}</p>}
      </div>
    </div>
  );
}
