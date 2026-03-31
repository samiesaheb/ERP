pub mod auth;
pub mod bom;
pub mod dashboard;
pub mod finance;
pub mod inventory;
pub mod masters;
pub mod procurement;
pub mod production;
pub mod sales;

// ---------------------------------------------------------------------------
// Convenience re-exports so callers can do `domain::SalesOrder` etc.
// ---------------------------------------------------------------------------

pub use auth::{Claims, LoginRequest, LoginResponse};
pub use bom::{Bom, BomExplosionLine, BomExplosionResult, BomLine, BomStatus, CreateBom, CreateBomLine};
pub use dashboard::{DashboardData, DashboardKpis, PipelineStage};
pub use finance::{CreateInvoice, CreatePayment, Invoice, InvoiceStatus, Payment};
pub use inventory::{CreateInventoryTxn, Inventory, InventoryTxn, InventoryTxnType, InventoryWithAlert};
pub use masters::{
    Country, CreateCustomer, CreateItem, CreateSupplier, Customer, CustomerType, Item, ItemSupplier,
    ItemType, Supplier, SupplierType, Uom, UomConversion,
};
pub use procurement::{
    CreateGrn, CreateGrnLine, CreatePoLine, CreatePurchaseOrder, Grn, GrnLine, PoLine, PoStatus,
    PurchaseOrder, QcStatus,
};
pub use production::{
    BatchStage, BatchStatus, CreateItemManagementTxn, CreateManufacturingOrder, ItemManagementTxn,
    ItemMgmtTxnType, ManufacturingOrder, MoStatus, ProductionBatch, UpdateProductionBatch,
};
pub use sales::{
    ArtworkDoc, ArtworkStatus, CreateArtworkDoc, CreateSalesOrder, FdaStatus, SalesOrder,
    SalesOrderStatus, UpdateSalesOrder,
};
