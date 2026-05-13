use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// DB row types (sqlx::FromRow, field names match column names)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Ingredient {
    pub id:        Uuid,
    pub code:      String,
    pub inci_name: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIngredient {
    pub code:      String,
    pub inci_name: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct FormulationRow {
    pub id:         Uuid,
    pub item_id:    Uuid,
    pub version:    i32,
    pub is_active:  bool,
    pub note:       String,
    pub batch_qty:  Decimal,
    pub batch_unit: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct FormulationLineRow {
    pub id:            Uuid,
    pub ingredient_id: Uuid,
    pub percentage:    Decimal,
    pub phase:         String,
    pub comment:       String,
}

// ---------------------------------------------------------------------------
// API output types (serialised to JSON, match frontend types)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngredientDetail {
    pub id:        Uuid,
    pub code:      String,
    pub inci_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductDetail {
    pub id:        Uuid,
    pub sku:       String,
    pub name:      String,
    pub item_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulationLineOut {
    pub id:                Uuid,
    pub ingredient:        Uuid,
    pub ingredient_detail: Option<IngredientDetail>,
    pub percentage:        Decimal,
    pub phase:             String,
    pub comment:           String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulationOut {
    pub id:             Uuid,
    pub product:        Uuid,
    pub product_detail: Option<ProductDetail>,
    pub version:        i32,
    pub is_active:      bool,
    pub note:           String,
    pub batch_qty:      Decimal,
    pub batch_unit:     String,
    pub lines:          Vec<FormulationLineOut>,
}

// Response type for /api/v1/products — items with product-style field names
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductOut {
    pub id:        Uuid,
    pub sku:       String,
    pub name:      String,
    pub item_type: String,
}

// ---------------------------------------------------------------------------
// Request body types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulationLine {
    pub ingredient:  Uuid,
    pub percentage:  Decimal,
    #[serde(default)]
    pub phase:       String,
    #[serde(default)]
    pub comment:     String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFormulation {
    pub product:    Uuid,
    pub version:    i32,
    #[serde(default)]
    pub is_active:  bool,
    #[serde(default)]
    pub note:       String,
    pub batch_qty:  Option<Decimal>,
    pub batch_unit: Option<String>,
    #[serde(default)]
    pub lines:      Vec<CreateFormulationLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchFormulation {
    pub is_active:  Option<bool>,
    pub note:       Option<String>,
    pub batch_qty:  Option<Decimal>,
    pub batch_unit: Option<String>,
    pub lines:      Option<Vec<CreateFormulationLine>>,
}
