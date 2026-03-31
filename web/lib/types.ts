// Mirrors every Rust domain struct exactly (snake_case, string for Uuid/Decimal)

// ---------------------------------------------------------------------------
// Masters
// ---------------------------------------------------------------------------

export interface CustomerType {
  id: string;
  name: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface Customer {
  id: string;
  name: string;
  customer_type_id: string;
  country_id: string;
  created_at: string;
}

export interface Uom {
  id: string;
  name: string;
  code: string;
}

export interface UomConversion {
  id: string;
  from_uom_id: string;
  to_uom_id: string;
  item_id: string | null;
  factor: string;
}

export type ItemType = 'fg' | 'raw_mat' | 'pack_mat';

export interface Item {
  id: string;
  code: string;
  description: string;
  item_type: ItemType;
  uom_id: string;
  is_active: boolean;
}

export type SupplierType = 'international' | 'local';

export interface Supplier {
  id: string;
  name: string;
  country_id: string;
  supplier_type: SupplierType;
  category: string;
  lead_time_days: number;
  is_active: boolean;
}

export interface ItemSupplier {
  id: string;
  item_id: string;
  supplier_id: string;
  is_preferred: boolean;
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export type SalesOrderStatus = 'artwork' | 'planning' | 'production' | 'packing' | 'shipped';
export type ArtworkStatus = 'draft' | 'in_review' | 'approved';
export type FdaStatus = 'pending' | 'submitted' | 'approved';

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  country_id: string;
  status: SalesOrderStatus;
  total_pieces: string;
  artwork_status: ArtworkStatus;
  fda_required: boolean;
  fda_status: FdaStatus | null;
  created_at: string;
}

export interface ArtworkDoc {
  id: string;
  sales_order_id: string;
  doc_type: string;
  file_url: string;
  uploaded_at: string;
}

// ---------------------------------------------------------------------------
// BOM
// ---------------------------------------------------------------------------

export type BomStatus = 'draft' | 'active' | 'under_review';

export interface Bom {
  id: string;
  code: string;
  item_id: string;
  version: number;
  status: BomStatus;
  created_at: string;
}

export interface BomLine {
  id: string;
  bom_id: string;
  component_item_id: string;
  qty_per_batch: string;
  uom_id: string;
  line_order: number;
}

export interface BomExplosionLine {
  item_id: string;
  item_code: string;
  description: string;
  required_qty: string;
  uom: string;
  on_hand: string;
  available: string;
  shortfall: string;
}

export interface BomExplosionResult {
  bom_id: string;
  bom_code: string;
  fg_item_id: string;
  target_qty: string;
  lines: BomExplosionLine[];
}

// ---------------------------------------------------------------------------
// Procurement
// ---------------------------------------------------------------------------

export type PoStatus = 'ordered' | 'confirmed' | 'in_transit' | 'received';
export type QcStatus = 'pending' | 'passed' | 'failed' | 'hold';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: PoStatus;
  expected_date: string;
  total_amount: string;
  supplier_type: SupplierType;
  created_at: string;
}

export interface PoLine {
  id: string;
  po_id: string;
  item_id: string;
  qty_ordered: string;
  qty_received: string;
  unit_price: string;
  uom_id: string;
}

export interface Grn {
  id: string;
  grn_number: string;
  po_id: string;
  received_date: string;
  created_at: string;
}

export interface GrnLine {
  id: string;
  grn_id: string;
  po_line_id: string;
  item_id: string;
  qty_received: string;
  batch_number: string;
  qc_status: QcStatus;
  into_stock: boolean;
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export type InventoryTxnType = 'receipt' | 'issue' | 'return' | 'conversion' | 'loss' | 'adjustment';

export interface Inventory {
  id: string;
  item_id: string;
  qty_on_hand: string;
  qty_reserved: string;
  qty_available: string;
  updated_at: string;
}

export interface InventoryWithAlert extends Inventory {
  item_code: string;
  item_description: string;
  low_stock: boolean;
}

export interface InventoryTxn {
  id: string;
  item_id: string;
  txn_type: InventoryTxnType;
  qty: string;
  ref_doc_type: string | null;
  ref_doc_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export type MoStatus = 'planned' | 'running' | 'packing' | 'done' | 'on_hold';
export type BatchStage = 'bulk' | 'formulation' | 'filling' | 'packing' | 'loading';
export type BatchStatus = 'running' | 'delayed' | 'done';
export type ItemMgmtTxnType = 'issue' | 'return' | 'conversion' | 'loss' | 'receipt';

export interface ManufacturingOrder {
  id: string;
  mo_number: string;
  sales_order_id: string;
  item_id: string;
  bom_id: string;
  target_qty: string;
  status: MoStatus;
  created_at: string;
}

export interface ProductionBatch {
  id: string;
  batch_number: string;
  mo_id: string;
  stage: BatchStage;
  pct_complete: string;
  status: BatchStatus;
  created_at: string;
}

export interface ItemManagementTxn {
  id: string;
  batch_id: string;
  txn_type: ItemMgmtTxnType;
  item_id: string;
  qty: string;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export type InvoiceStatus = 'not_due' | 'partial' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  invoice_number: string;
  sales_order_id: string;
  customer_id: string;
  amount: string;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount_paid: string;
  paid_at: string;
  reference: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardKpis {
  open_sales_orders: number;
  active_manufacturing_orders: number;
  open_purchase_orders: number;
  pending_invoices_value: string;
}

export interface PipelineStage {
  stage: string;
  count: number;
  fill_pct: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  pipeline: PipelineStage[];
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginResponse {
  token: string;
  user_id: string;
  email: string;
}
