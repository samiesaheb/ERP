'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Icon({ path, path2 }: { path: string; path2?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={path} />
      {path2 && <path d={path2} />}
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

const ICONS: Record<string, React.ReactElement> = {
  '/':                     <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  '/sales-orders':         <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  '/artwork':              <Icon path="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  '/items':                <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  '/bom':                  <Icon path="M4 6h16M4 10h16M4 14h10M4 18h6" />,
  '/suppliers':            <Icon path="M1 3h15v13H1z" path2="M16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />,
  '/purchase-orders':      <Icon path="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />,
  '/receiving':            <Icon path="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />,
  '/inventory':            <Icon path="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />,
  '/manufacturing-orders': <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" path2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  '/production':           <Icon path="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
  '/invoicing':            <Icon path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  '/shipments':            <Icon path="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
};

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
      { label: 'Artwork & FDA', href: '/artwork' },
      { label: 'Shipments', href: '/shipments' },
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
      { label: 'Receiving', href: '/receiving' },
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
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored !== null) setCollapsed(stored === 'true');
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  }

  return (
    <aside
      className={`${collapsed ? 'w-12' : 'w-56'} shrink-0 border-r-[0.5px] border-neutral-200 bg-neutral-50 h-screen sticky top-0 flex flex-col transition-[width] duration-200`}
    >
      {/* Brand */}
      <div className="px-3 py-5 border-b-[0.5px] border-neutral-200 flex items-center justify-between min-h-[60px]">
        {!collapsed && (
          <div>
            <span className="text-sm font-bold text-neutral-900 tracking-tight">SkyHigh MES</span>
            <p className="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-wider">Manufacturing</p>
          </div>
        )}
        <button
          onClick={toggle}
          className={`p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 transition-colors ${collapsed ? 'mx-auto' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronIcon collapsed={collapsed} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                {group.title}
              </p>
            )}
            <div className={`space-y-0.5 ${collapsed ? 'mt-1' : ''}`}>
              {group.items.map((item) => {
                const active =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                      collapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-neutral-900 text-white font-medium'
                        : 'text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900'
                    }`}
                  >
                    <span className={active ? 'text-white' : 'text-neutral-400'}>
                      {ICONS[item.href]}
                    </span>
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t-[0.5px] border-neutral-200 px-4 py-3">
          <p className="text-[11px] text-neutral-400">Cosmetics OEM · v0.1</p>
        </div>
      )}
    </aside>
  );
}
