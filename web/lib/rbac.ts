/**
 * Role-Based Access Control — single source of truth for the frontend.
 * The API enforces permissions server-side; this drives UI visibility.
 */

export type Role =
  | 'admin'
  | 'planner'
  | 'supervisor'
  | 'warehouse'
  | 'qc'
  | 'purchasing'
  | 'sales'
  | 'subcontractor';

/**
 * Routes each role can access.
 * '*' means the role has access to everything.
 * Routes are prefix-matched (e.g. '/sales-orders' also covers '/sales-orders/123').
 */
export const ROLE_ACCESS: Record<Role, string[] | '*'> = {
  admin: '*',

  sales: [
    '/',
    '/sales-orders',
    '/customers',
    '/artwork',
    '/shipments',
    '/invoicing',
    '/payments',
    '/items',
  ],

  purchasing: [
    '/',
    '/purchase-orders',
    '/receiving',
    '/inventory',
    '/suppliers',
    '/items',
  ],

  planner: [
    '/',
    '/sales-orders',
    '/bom',
    '/items',
    '/manufacturing-orders',
    '/mrp',
    '/production',
    '/inventory',
    '/purchase-orders',
    '/receiving',
    '/suppliers',
  ],

  supervisor: [
    '/',
    '/manufacturing-orders',
    '/production',
    '/inventory',
    '/shipments',
    '/receiving',
    '/items',
    '/bom',
    '/sales-orders',
  ],

  warehouse: [
    '/',
    '/inventory',
    '/receiving',
    '/shipments',
    '/items',
  ],

  qc: [
    '/',
    '/inventory',
    '/production',
    '/receiving',
    '/artwork',
    '/items',
  ],

  subcontractor: [
    '/',
    '/production',
  ],
};

/** Returns true if the given role can access the given pathname. */
export function canAccess(role: string, pathname: string): boolean {
  const access = ROLE_ACCESS[role as Role];
  if (!access) return false;
  if (access === '*') return true;
  if (pathname === '/') return access.includes('/');
  return access.some((r) => r !== '/' && pathname.startsWith(r));
}

/** Decode the role from a raw JWT string (no signature verification). */
export function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

/** Read the role from the browser cookie. */
export function getRoleFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  return getRoleFromToken(match[1]);
}
