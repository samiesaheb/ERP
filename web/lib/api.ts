import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  Bom, BomExplosionResult, BomLine,
  Country, Customer, CustomerType,
  DashboardData,
  Grn, GrnLine,
  Inventory, InventoryTxn, InventoryWithAlert,
  Invoice,
  Item, ItemSupplier,
  ManufacturingOrder,
  Payment,
  PoLine, ProductionBatch, PurchaseOrder,
  SalesOrder, ArtworkDoc,
  Supplier, Uom,
} from './types';

// ---------------------------------------------------------------------------
// Base fetch — server-side with cookie auth
// ---------------------------------------------------------------------------

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (res.status === 401) {
    redirect('/login');
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const getDashboard = () => apiFetch<DashboardData>('/api/v1/dashboard/kpis');

// ---------------------------------------------------------------------------
// Masters
// ---------------------------------------------------------------------------

export const getCustomerTypes = () => apiFetch<CustomerType[]>('/api/v1/customer-types');
export const getCountries = () => apiFetch<Country[]>('/api/v1/countries');
export const getCustomers = () => apiFetch<Customer[]>('/api/v1/customers');
export const getUoms = () => apiFetch<Uom[]>('/api/v1/uoms');
export const getItems = (params?: { item_type?: string; search?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<Item[]>(`/api/v1/items${q ? `?${q}` : ''}`);
};
export const getSuppliers = () => apiFetch<Supplier[]>('/api/v1/suppliers');
export const getItemSuppliers = (itemId: string) =>
  apiFetch<ItemSupplier[]>(`/api/v1/items/${itemId}/suppliers`);

// ---------------------------------------------------------------------------
// Sales Orders
// ---------------------------------------------------------------------------

export const getSalesOrders = (params?: { status?: string; customer_id?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<SalesOrder[]>(`/api/v1/sales-orders${q ? `?${q}` : ''}`);
};
export const getSalesOrder = (id: string) => apiFetch<SalesOrder>(`/api/v1/sales-orders/${id}`);
export const getArtworkDocs = (soId: string) =>
  apiFetch<ArtworkDoc[]>(`/api/v1/sales-orders/${soId}/artwork-docs`);

// ---------------------------------------------------------------------------
// BOM
// ---------------------------------------------------------------------------

export const getBoms = () => apiFetch<Bom[]>('/api/v1/boms');
export const getBom = (id: string) => apiFetch<Bom>(`/api/v1/boms/${id}`);
export const getBomLines = (id: string) => apiFetch<BomLine[]>(`/api/v1/boms/${id}/lines`);
export const explodeBom = (id: string, targetQty?: number) => {
  const q = targetQty ? `?target_qty=${targetQty}` : '';
  return apiFetch<BomExplosionResult>(`/api/v1/boms/${id}/explode${q}`);
};

// ---------------------------------------------------------------------------
// Procurement
// ---------------------------------------------------------------------------

export const getPurchaseOrders = (params?: { status?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<PurchaseOrder[]>(`/api/v1/purchase-orders${q ? `?${q}` : ''}`);
};
export const getPurchaseOrder = (id: string) =>
  apiFetch<PurchaseOrder>(`/api/v1/purchase-orders/${id}`);
export const getPoLines = (id: string) =>
  apiFetch<PoLine[]>(`/api/v1/purchase-orders/${id}/lines`);
export const getGrnLines = (grnId: string) =>
  apiFetch<GrnLine[]>(`/api/v1/grn/${grnId}/lines`);

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const getInventory = () =>
  apiFetch<InventoryWithAlert[]>('/api/v1/inventory');

// ---------------------------------------------------------------------------
// Manufacturing Orders
// ---------------------------------------------------------------------------

export const getManufacturingOrders = (params?: { status?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<ManufacturingOrder[]>(`/api/v1/manufacturing-orders${q ? `?${q}` : ''}`);
};
export const getManufacturingOrder = (id: string) =>
  apiFetch<ManufacturingOrder>(`/api/v1/manufacturing-orders/${id}`);

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export const getProductionBatches = () =>
  apiFetch<ProductionBatch[]>('/api/v1/production/batches');

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export const getInvoices = (params?: { status?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<Invoice[]>(`/api/v1/invoices${q ? `?${q}` : ''}`);
};
