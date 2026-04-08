import { clientFetch } from './client-api';

// ---------------------------------------------------------------------------
// Sales Orders
// ---------------------------------------------------------------------------

export function updateSalesOrderStatus(id: string, status: string) {
  return clientFetch(`/api/v1/sales-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Manufacturing Orders
// ---------------------------------------------------------------------------

export function updateManufacturingOrderStatus(id: string, status: string) {
  return clientFetch(`/api/v1/manufacturing-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Production Batches
// ---------------------------------------------------------------------------

export function updateProductionBatchStatus(id: string, status: string) {
  return clientFetch(`/api/v1/production/batches/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------

export function updatePurchaseOrderStatus(id: string, status: string) {
  return clientFetch(`/api/v1/purchase-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------

export function updateShipmentStatus(id: string, status: string) {
  return clientFetch(`/api/v1/shipments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export function updateInvoiceStatus(id: string, status: string) {
  return clientFetch(`/api/v1/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}
