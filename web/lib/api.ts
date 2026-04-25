import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  Artwork, FdaRegistration, FdaDocument,
  Bom, BomExplosionResult, BomLine,
  Country, Customer, CustomerType,
  DashboardData,
  Invoice, InvoiceLine, Payment,
  InventoryWithItem, InventoryTransaction,
  Item, ItemSupplier, ItemUomConversion,
  ManufacturingOrder, ProductionBatch, ProductionPlan, BatchComponentIssue,
  PurchaseOrder, PurchaseOrderLine, Receipt, ReceiptLine,
  SalesOrder, SalesOrderLine,
  Shipment, ShipmentLine, ShippingDocument,
  Supplier, Uom,
  User,
  AuditLog,
  WarehouseLocation,
  WorkCenter, RoutingStep, QcTest, DowntimeEvent, AccessRequest,
} from './types';

// ---------------------------------------------------------------------------
// Base fetch — server-side with cookie auth
// ---------------------------------------------------------------------------

const _rawApiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';
const API_URL = _rawApiUrl && !_rawApiUrl.startsWith('http') ? `https://${_rawApiUrl}` : _rawApiUrl;

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

export const getCustomerTypes      = () => apiFetch<CustomerType[]>('/api/v1/customer-types');
export const getCountries          = () => apiFetch<Country[]>('/api/v1/countries');
export const getCustomers          = () => apiFetch<Customer[]>('/api/v1/customers');
export const getUoms               = () => apiFetch<Uom[]>('/api/v1/uoms');
export const getItems = (params?: { item_type?: string; search?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<Item[]>(`/api/v1/items${q ? `?${q}` : ''}`);
};
export const getSuppliers          = () => apiFetch<Supplier[]>('/api/v1/suppliers');
export const getItemSuppliers      = (itemId: string) =>
  apiFetch<ItemSupplier[]>(`/api/v1/items/${itemId}/suppliers`);
export const getItemUomConversions = (itemId: string) =>
  apiFetch<ItemUomConversion[]>(`/api/v1/items/${itemId}/uom-conversions`);

// ---------------------------------------------------------------------------
// Sales Orders
// ---------------------------------------------------------------------------

export const getSalesOrders = (params?: { status?: string; customer_id?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<SalesOrder[]>(`/api/v1/sales-orders${q ? `?${q}` : ''}`);
};
export const getSalesOrder = (id: string) => apiFetch<SalesOrder>(`/api/v1/sales-orders/${id}`);
export const getSoLines    = (soId: string) =>
  apiFetch<SalesOrderLine[]>(`/api/v1/sales-orders/${soId}/lines`);

// ---------------------------------------------------------------------------
// Artwork & FDA
// ---------------------------------------------------------------------------

export const getArtworks          = () => apiFetch<Artwork[]>('/api/v1/artworks');
export const getArtworksBySo      = (soId: string) =>
  apiFetch<Artwork[]>(`/api/v1/sales-orders/${soId}/artworks`);
export const getFdaRegistrations  = () =>
  apiFetch<FdaRegistration[]>('/api/v1/fda-registrations');
export const getFdaDocuments      = (regId: string) =>
  apiFetch<FdaDocument[]>(`/api/v1/fda-registrations/${regId}/documents`);

// ---------------------------------------------------------------------------
// BOM
// ---------------------------------------------------------------------------

export const getBoms     = () => apiFetch<Bom[]>('/api/v1/boms');
export const getBom      = (id: string) => apiFetch<Bom>(`/api/v1/boms/${id}`);
export const getBomLines = (id: string) => apiFetch<BomLine[]>(`/api/v1/boms/${id}/lines`);
export const explodeBom  = (id: string, targetQty?: number) => {
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
export const getPurchaseOrder  = (id: string) =>
  apiFetch<PurchaseOrder>(`/api/v1/purchase-orders/${id}`);
export const getPoLines        = (id: string) =>
  apiFetch<PurchaseOrderLine[]>(`/api/v1/purchase-orders/${id}/lines`);
export const getReceipts       = () => apiFetch<Receipt[]>('/api/v1/receipts');
export const getReceiptLines   = (receiptId: string) =>
  apiFetch<ReceiptLine[]>(`/api/v1/receipts/${receiptId}/lines`);

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const getInventory     = () => apiFetch<InventoryWithItem[]>('/api/v1/inventory');
export const getInventoryTxns = () =>
  apiFetch<InventoryTransaction[]>('/api/v1/inventory/transactions');
export const getLocations     = () => apiFetch<WarehouseLocation[]>('/api/v1/locations');

// ---------------------------------------------------------------------------
// Manufacturing Orders
// ---------------------------------------------------------------------------

export const getManufacturingOrders = (params?: { status?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<ManufacturingOrder[]>(`/api/v1/manufacturing-orders${q ? `?${q}` : ''}`);
};
export const getManufacturingOrder = (id: string) =>
  apiFetch<ManufacturingOrder>(`/api/v1/manufacturing-orders/${id}`);
export const getMoBatches = (moId: string) =>
  apiFetch<ProductionBatch[]>(`/api/v1/manufacturing-orders/${moId}/batches`);

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export const getProductionBatches = () =>
  apiFetch<ProductionBatch[]>('/api/v1/production/batches');
export const getBatchIssues       = (batchId: string) =>
  apiFetch<BatchComponentIssue[]>(`/api/v1/production/batches/${batchId}/issues`);
export const getProductionPlans   = () =>
  apiFetch<ProductionPlan[]>('/api/v1/production/plans');

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------

export const getShipments          = () => apiFetch<Shipment[]>('/api/v1/shipments');
export const getShipment           = (id: string) => apiFetch<Shipment>(`/api/v1/shipments/${id}`);
export const getShipmentLines      = (shipmentId: string) =>
  apiFetch<ShipmentLine[]>(`/api/v1/shipments/${shipmentId}/lines`);
export const getShippingDocuments  = (shipmentId: string) =>
  apiFetch<ShippingDocument[]>(`/api/v1/shipments/${shipmentId}/documents`);

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export const getInvoices = (params?: { status?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<Invoice[]>(`/api/v1/invoices${q ? `?${q}` : ''}`);
};
export const getInvoice      = (id: string) => apiFetch<Invoice>(`/api/v1/invoices/${id}`);
export const getInvoiceLines = (invoiceId: string) =>
  apiFetch<InvoiceLine[]>(`/api/v1/invoices/${invoiceId}/lines`);
export const getPayments     = () => apiFetch<Payment[]>('/api/v1/payments');

// ---------------------------------------------------------------------------
// Users (admin)
// ---------------------------------------------------------------------------

export const getUsers = () => apiFetch<User[]>('/api/v1/users');

// ---------------------------------------------------------------------------
// Audit Trail
// ---------------------------------------------------------------------------

export const getAuditLogs = (params?: { table_name?: string; action?: string; record_id?: string; limit?: number }) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
  ).toString();
  return apiFetch<AuditLog[]>(`/api/v1/audit-logs${q ? `?${q}` : ''}`);
};

// ---------------------------------------------------------------------------
// Shop Floor
// ---------------------------------------------------------------------------

export const getWorkCenters   = () => apiFetch<WorkCenter[]>('/api/v1/work-centers');
export const getRoutingSteps  = (bomId: string) =>
  apiFetch<RoutingStep[]>(`/api/v1/boms/${bomId}/routing`);
export const getQcTests       = (batchId: string) =>
  apiFetch<QcTest[]>(`/api/v1/production/batches/${batchId}/qc-tests`);
export const getDowntimeEvents = (batchId: string) =>
  apiFetch<DowntimeEvent[]>(`/api/v1/production/batches/${batchId}/downtime`);
export const getAccessRequests = () =>
  apiFetch<AccessRequest[]>('/api/v1/access-requests');
