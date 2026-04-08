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
// Artworks
// ---------------------------------------------------------------------------

export function updateArtworkStatus(id: string, status: string) {
  return clientFetch(`/api/v1/artworks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// FDA Registrations
// ---------------------------------------------------------------------------

export function updateFdaStatus(id: string, status: string) {
  return clientFetch(`/api/v1/fda-registrations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// BOM
// ---------------------------------------------------------------------------

export function deleteBom(id: string) {
  return clientFetch(`/api/v1/boms/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export function updateItem(id: string, patch: { is_active?: boolean; fda_required?: boolean; description?: string }) {
  return clientFetch(`/api/v1/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
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
