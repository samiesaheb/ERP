'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/' }],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Sales Orders', href: '/sales-orders' },
      { label: 'Artwork', href: '/artwork' },
    ],
  },
  {
    title: 'Masters',
    items: [
      { label: 'Items', href: '/items' },
      { label: 'Bill of Materials', href: '/bom' },
      { label: 'Suppliers', href: '/suppliers' },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { label: 'Purchase Orders', href: '/purchase-orders' },
      { label: 'Receiving (GRN)', href: '/receiving' },
      { label: 'Inventory', href: '/inventory' },
    ],
  },
  {
    title: 'Production',
    items: [
      { label: 'Mfg Orders', href: '/manufacturing-orders' },
      { label: 'Production Floor', href: '/production' },
    ],
  },
  {
    title: 'Finance',
    items: [{ label: 'Invoicing', href: '/invoicing' }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r-[0.5px] border-neutral-200 bg-neutral-50 h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-5 border-b-[0.5px] border-neutral-200">
        <span className="text-sm font-semibold text-neutral-900 tracking-tight">SkyHigh MES</span>
        <p className="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-wider">
          Manufacturing
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map((group) => (
          <div key={group.title}>
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-2 py-1.5 rounded text-sm transition-colors ${
                    active
                      ? 'bg-neutral-900 text-white font-medium'
                      : 'text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t-[0.5px] border-neutral-200 px-4 py-3">
        <p className="text-[11px] text-neutral-400">Cosmetics OEM · v0.1</p>
      </div>
    </aside>
  );
}
