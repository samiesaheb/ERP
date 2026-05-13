pub mod audit;
pub mod auth;
pub mod artwork;
pub mod bom;
pub mod formulation;
pub mod dashboard;
pub mod finance;
pub mod inventory;
pub mod masters;
pub mod procurement;
pub mod production;
pub mod sales;
pub mod search;
pub mod shipments;
pub mod shop_floor;

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

pub use formulation::{
    Ingredient, CreateIngredient,
    IngredientDetail, ProductDetail,
    FormulationLineOut, FormulationOut,
    ProductOut,
    CreateFormulationLine, CreateFormulation, PatchFormulation,
    FormulationRow,
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
    CycleCount,
    WarehouseLocation, CreateWarehouseLocation, UpdateWarehouseLocation,
};

pub use masters::{
    Country, CustomerType,
    Customer, CreateCustomer, UpdateCustomer,
    Uom,
    Supplier, CreateSupplier, UpdateSupplier,
    Item, CreateItem, UpdateItem,
    ItemUomConversion, CreateItemUomConversion,
    ItemSupplier, CreateItemSupplier,
};

pub use procurement::{
    PurchaseOrder, CreatePurchaseOrder, UpdatePurchaseOrder,
    PurchaseOrderLine, CreatePurchaseOrderLine,
    Receipt, CreateReceipt,
    ReceiptLine, CreateReceiptLine, UpdateReceiptLine,
};

pub use production::{
    ManufacturingOrder, CreateManufacturingOrder, UpdateManufacturingOrder,
    ProductionBatch, UpdateProductionBatch,
    BatchComponentIssue, CreateBatchComponentIssue,
    ProductionPlan, CreateProductionPlan,
};

pub use sales::{
    SalesOrder, CreateSalesOrder, UpdateSalesOrder,
    SalesOrderLine, CreateSalesOrderLine, UpdateSalesOrderLine,
};

pub use search::SearchResult;

pub use shipments::{
    Shipment, CreateShipment, UpdateShipment,
    ShipmentLine, CreateShipmentLine,
    ShippingDocument, CreateShippingDocument,
};

pub use shop_floor::{
    WorkCenter, CreateWorkCenter, UpdateWorkCenter,
    RoutingStep, CreateRoutingStep,
    QcTest, CreateQcTest, UpdateQcTest,
    DowntimeEvent, CreateDowntimeEvent, UpdateDowntimeEvent,
    AccessRequest, CreateAccessRequest, UpdateAccessRequest,
};
