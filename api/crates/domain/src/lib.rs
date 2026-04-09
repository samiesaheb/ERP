pub mod audit;
pub mod auth;
pub mod artwork;
pub mod bom;
pub mod dashboard;
pub mod finance;
pub mod inventory;
pub mod masters;
pub mod procurement;
pub mod production;
pub mod sales;
pub mod shipments;

// ---------------------------------------------------------------------------
// Convenience re-exports
// ---------------------------------------------------------------------------

pub use audit::{AuditLog, AuditLogQuery};
pub use auth::{Claims, LoginRequest, LoginResponse, User, CreateUser, UpdateUser};

pub use artwork::{
    Artwork, CreateArtwork, UpdateArtwork,
    FdaDocument, CreateFdaDocument,
    FdaRegistration, CreateFdaRegistration, UpdateFdaRegistration,
};

pub use bom::{
    Bom, CreateBom,
    BomLine, CreateBomLine,
    BomExplosionLine, BomExplosionResult,
};

pub use dashboard::{DashboardData, DashboardKpis, PipelineStage};

pub use finance::{
    Invoice, CreateInvoice, UpdateInvoice,
    InvoiceLine, CreateInvoiceLine,
    Payment, CreatePayment,
};

pub use inventory::{
    Inventory, InventoryWithItem,
    InventoryTransaction, CreateInventoryTransaction,
};

pub use masters::{
    Country, CustomerType,
    Customer, CreateCustomer,
    Uom,
    Supplier, CreateSupplier,
    Item, CreateItem, UpdateItem,
    ItemUomConversion, CreateItemUomConversion,
    ItemSupplier, CreateItemSupplier,
};

pub use procurement::{
    PurchaseOrder, CreatePurchaseOrder, UpdatePurchaseOrder,
    PurchaseOrderLine, CreatePurchaseOrderLine,
    Receipt, CreateReceipt,
    ReceiptLine, CreateReceiptLine,
};

pub use production::{
    ManufacturingOrder, CreateManufacturingOrder, UpdateManufacturingOrder,
    ProductionBatch, UpdateProductionBatch,
    BatchComponentIssue, CreateBatchComponentIssue,
    ProductionPlan, CreateProductionPlan,
};

pub use sales::{
    SalesOrder, CreateSalesOrder, UpdateSalesOrder,
    SalesOrderLine, CreateSalesOrderLine,
};

pub use shipments::{
    Shipment, CreateShipment, UpdateShipment,
    ShipmentLine, CreateShipmentLine,
    ShippingDocument, CreateShippingDocument,
};
