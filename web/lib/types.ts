// Mirrors every Rust domain struct exactly (snake_case, string for Uuid/Decimal)

// ---------------------------------------------------------------------------
// Masters
// ---------------------------------------------------------------------------

export interface CustomerType {
  id: string;
  name: string;
  created_at: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  customer_type_id: string;
  country_id: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface Uom {
  id: string;
  code: string;
  description: string | null;
}

export interface Item {
  id: string;
  item_code: string;
  description: string;
  item_type: string;   // 'FG' | 'RawMat' | 'PackMat'
  uom_id: string;
  fda_required: boolean;
  is_active: boolean;
  created_at: string;
  reorder_point: string | null;      // NUMERIC — trigger replenishment
  abc_class: string | null;          // 'A' | 'B' | 'C'
  lifecycle_status: string;          // 'active' | 'phaseout' | 'obsolete'
}

export interface Supplier {
  id: string;
  name: string;
  supplier_type: string;   // 'local' | 'international'
  country_id: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: string | null;
  created_at: string;
}

export interface ItemSupplier {
  id: string;
  item_id: string;
  supplier_id: string;
  supplier_item_code: string | null;
  lead_time_days: number | null;
  unit_cost: string | null;
  preferred: boolean;
}

export interface ItemUomConversion {
  id: string;
  item_id: string;
  from_uom_id: string;
  to_uom_id: string;
  conversion_factor: string;
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  country_id: string;
  status: string;          // draft / confirmed / in_production / shipped / invoiced / cancelled
  artwork_status: string | null;
  fda_required: boolean;
  fda_status: string | null;
  total_pieces: string | null;
  order_date: string | null;
  required_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface SalesOrderLine {
  id: string;
  sales_order_id: string;
  item_id: string;
  qty_ordered: string;
  uom_id: string;
  unit_price: string | null;
  notes: string | null;
  bom_id: string | null;
}

// ---------------------------------------------------------------------------
// Artwork & FDA
// ---------------------------------------------------------------------------

export interface Artwork {
  id: string;
  sales_order_id: string;
  item_id: string;
  version: number;
  status: string;   // draft / in_review / approved / rejected
  file_url: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface FdaRegistration {
  id: string;
  sales_order_id: string;
  item_id: string;
  registration_number: string | null;
  status: string;   // pending / submitted / approved / rejected
  submitted_at: string | null;
  approved_at: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface FdaDocument {
  id: string;
  fda_registration_id: string;
  doc_type: string;
  file_url: string;
  uploaded_at: string;
}

// ---------------------------------------------------------------------------
// BOM
// ---------------------------------------------------------------------------

export interface Bom {
  id: string;
  finished_good_id: string;
  description: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
}

export interface BomLine {
  id: string;
  bom_id: string;
  component_item_id: string;
  qty_required: string;
  uom_id: string;
  notes: string | null;
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
  fg_item_id: string;
  target_qty: string;
  lines: BomExplosionLine[];
}

// ---------------------------------------------------------------------------
// Procurement
// ---------------------------------------------------------------------------

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  manufacturing_order_id: string | null;
  status: string;   // draft / sent / confirmed / partially_received / received / cancelled
  order_date: string | null;
  expected_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  item_id: string;
  qty_ordered: string;
  qty_received: string;
  uom_id: string;
  unit_cost: string | null;
}

export interface Receipt {
  id: string;
  receipt_number: string;
  purchase_order_id: string;
  received_by: string | null;
  received_at: string;
  notes: string | null;
}

export interface ReceiptLine {
  id: string;
  receipt_id: string;
  po_line_id: string;
  item_id: string;
  qty_received: string;
  uom_id: string;
  lot_number: string | null;
  expiry_date: string | null;
  qc_status: string;   // pending / passed / failed
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryWithItem {
  id: string;
  item_id: string;
  item_code: string;
  description: string;
  location: string | null;
  lot_number: string | null;
  qty_available: string;
  qty_reserved: string;
  uom_id: string;
  last_updated: string;
  last_counted_at: string | null;
  reorder_point: string | null;
  reorder_alert: boolean;   // ATP (available − reserved) < reorder_point
}

export interface WarehouseLocation {
  id: string;
  code: string;
  zone: string | null;
  aisle: string | null;
  section: string | null;
  shelf_level: string | null;
  travel_sequence: number | null;
  location_type: string;   // 'rack' | 'bin' | 'virtual' | 'dock'
  is_active: boolean;
  is_virtual: boolean;
  notes: string | null;
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: string;   // receipt / issue / return / conversion / loss / adjustment
  reference_type: string | null;
  reference_id: string | null;
  qty: string;
  uom_id: string | null;
  lot_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export interface ManufacturingOrder {
  id: string;
  mo_number: string;
  sales_order_id: string | null;
  item_id: string;
  bom_id: string;
  status: string;   // draft / planned / in_progress / completed / cancelled
  qty_planned: string;
  qty_produced: string;
  uom_id: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProductionBatch {
  id: string;
  batch_number: string;
  manufacturing_order_id: string;
  bom_id: string;
  status: string;   // planned / bulk_production / filling / packing / completed
  qty_bulk_produced: string | null;
  qty_filled: string | null;
  qty_packed: string | null;
  uom_id: string;
  bulk_start: string | null;
  bulk_end: string | null;
  fill_start: string | null;
  fill_end: string | null;
  pack_start: string | null;
  pack_end: string | null;
  notes: string | null;
  created_at: string;
}

export interface BatchComponentIssue {
  id: string;
  batch_id: string;
  item_id: string;
  qty_issued: string;
  qty_returned: string;
  qty_loss: string;
  uom_id: string;
  lot_number: string | null;
  issued_at: string;
}

export interface ProductionPlan {
  id: string;
  plan_date: string;
  manufacturing_order_id: string;
  purchase_order_id: string | null;
  planned_qty: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------

export interface Shipment {
  id: string;
  shipment_number: string;
  sales_order_id: string;
  status: string;   // loading / dispatched / in_transit / delivered
  carrier: string | null;
  tracking_number: string | null;
  loaded_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ShipmentLine {
  id: string;
  shipment_id: string;
  item_id: string;
  batch_id: string | null;
  qty_shipped: string;
  uom_id: string;
}

export interface ShippingDocument {
  id: string;
  shipment_id: string;
  doc_type: string;
  file_url: string;
  issued_at: string | null;
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export interface Invoice {
  id: string;
  invoice_number: string;
  sales_order_id: string;
  customer_id: string;
  shipment_id: string | null;
  status: string;   // draft / sent / partially_paid / paid / overdue / cancelled
  issue_date: string | null;
  due_date: string | null;
  subtotal: string | null;
  tax: string;
  total: string | null;
  currency: string;
  notes: string | null;
  created_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  item_id: string | null;
  description: string | null;
  qty: string;
  uom_id: string;
  unit_price: string;
  line_total: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  payment_type: string;   // customer / supplier
  customer_id: string | null;
  supplier_id: string | null;
  invoice_id: string | null;
  purchase_order_id: string | null;
  amount: string;
  currency: string;
  payment_date: string | null;
  method: string | null;
  reference: string | null;
  status: string;   // pending / cleared / failed
  notes: string | null;
  created_at: string;
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
  full_name: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  allowed_days:      string | null;  // e.g. "Mon,Tue,Wed,Thu,Fri"
  access_time_start: string | null;  // "HH:MM" UTC
  access_time_end:   string | null;  // "HH:MM" UTC
}

// ---------------------------------------------------------------------------
// Shop Floor — Work Centers, Routing, QC, Downtime, Access Requests
// ---------------------------------------------------------------------------

export interface WorkCenter {
  id: string;
  code: string;
  name: string;
  center_type: string;   // mixer / filler / packer / lab / general
  capacity: string | null;
  status: string;        // active / maintenance / inactive
  notes: string | null;
  created_at: string;
}

export interface RoutingStep {
  id: string;
  bom_id: string;
  step_number: number;
  name: string;
  work_center_id: string;
  std_time_min: string;
  instructions: string | null;
}

export interface QcTest {
  id: string;
  batch_id: string;
  test_type: string;     // viscosity / ph / microbial / temperature / appearance / weight / other
  result_value: string | null;
  min_spec: string | null;
  max_spec: string | null;
  pass_fail: string;     // pending / pass / fail
  tested_by: string | null;
  tested_at: string;
  notes: string | null;
}

export interface DowntimeEvent {
  id: string;
  batch_id: string;
  work_center_id: string | null;
  reason_code: string;   // mechanical / cleaning / setup / material_shortage / operator / quality_hold / other
  description: string | null;
  start_time: string;
  end_time: string | null;
  reported_by: string | null;
  created_at: string;
}

export interface AccessRequest {
  id: string;
  user_id: string;
  permission: string;
  reason: string | null;
  status: string;        // pending / approved / denied
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Formulation
// ---------------------------------------------------------------------------

export interface Ingredient {
  id: string;
  code: string;
  inci_name: string;
  is_active: boolean;
}

export interface FormulationProduct {
  id: string;
  sku: string;
  name: string;
  item_type: string;
}

export interface FormulationLine {
  id: string;
  ingredient: string;
  ingredient_detail: { id: string; code: string; inci_name: string } | null;
  percentage: string;
  phase: string;
  comment: string;
}

export interface Formulation {
  id: string;
  product: string;
  product_detail: { id: string; sku: string; name: string } | null;
  version: number;
  is_active: boolean;
  note: string;
  batch_qty: string;
  batch_unit: string;
  procedures: string;
  lines: FormulationLine[];
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;                        // INSERT | UPDATE | DELETE
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
}
