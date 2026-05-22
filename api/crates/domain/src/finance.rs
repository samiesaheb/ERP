use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Invoice {
    pub id:             Uuid,
    pub invoice_number: String,
    pub customer_id:    Uuid,
    pub sales_order_id: Uuid,
    pub shipment_id:    Option<Uuid>,
    pub tax_rate_id:    Option<Uuid>,
    pub status:         String,          // draft / sent / partially_paid / paid / overdue / cancelled
    pub issue_date:     Option<NaiveDate>,
    pub due_date:       Option<NaiveDate>,
    pub subtotal:       Option<Decimal>, // NUMERIC(18,4) — recalculated from lines
    pub tax:            Decimal,         // NUMERIC(18,4) NOT NULL DEFAULT 0
    pub total:          Option<Decimal>, // NUMERIC(18,4) — subtotal + tax
    pub currency:       String,          // VARCHAR(3) NOT NULL DEFAULT 'USD'
    pub notes:          Option<String>,
    pub created_at:     DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoice {
    pub sales_order_id: Uuid,
    pub customer_id:    Uuid,
    pub shipment_id:    Option<Uuid>,
    pub tax_rate_id:    Option<Uuid>,
    pub issue_date:     Option<NaiveDate>,
    pub due_date:       Option<NaiveDate>,
    pub tax:            Option<Decimal>,
    pub currency:       Option<String>,
    pub notes:          Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInvoice {
    pub status:     Option<String>,
    pub issue_date: Option<NaiveDate>,
    pub due_date:   Option<NaiveDate>,
    pub tax:        Option<Decimal>,
    pub notes:      Option<String>,
}

// ---------------------------------------------------------------------------
// Invoice Line
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct InvoiceLine {
    pub id:          Uuid,
    pub invoice_id:  Uuid,
    pub item_id:     Option<Uuid>,   // REFERENCES items(id) — nullable
    pub description: Option<String>,
    pub qty:         Decimal,        // NUMERIC(18,4) NOT NULL
    pub uom_id:      Uuid,           // NOT NULL REFERENCES uoms(id)
    pub unit_price:  Decimal,        // NUMERIC(18,4) NOT NULL
    pub line_total:  Decimal,        // NUMERIC(18,4) NOT NULL
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceLine {
    pub item_id:     Option<Uuid>,
    pub description: Option<String>,
    pub qty:         Decimal,
    pub uom_id:      Uuid,
    pub unit_price:  Decimal,
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Payment {
    pub id:                Uuid,
    pub payment_number:    String,
    pub payment_type:      String,           // customer / supplier
    pub customer_id:       Option<Uuid>,
    pub supplier_id:       Option<Uuid>,
    pub invoice_id:        Option<Uuid>,
    pub purchase_order_id: Option<Uuid>,
    pub amount:            Decimal,          // NUMERIC(18,4) NOT NULL
    pub currency:          String,           // VARCHAR(3) NOT NULL DEFAULT 'USD'
    pub payment_date:      Option<NaiveDate>,
    pub method:            Option<String>,   // Wire / ACH / Check / Credit
    pub reference:         Option<String>,
    pub status:            String,           // pending / cleared / failed
    pub notes:             Option<String>,
    pub created_at:        DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePayment {
    pub payment_type:      String,
    pub customer_id:       Option<Uuid>,
    pub supplier_id:       Option<Uuid>,
    pub invoice_id:        Option<Uuid>,
    pub purchase_order_id: Option<Uuid>,
    pub amount:            Decimal,
    pub currency:          Option<String>,
    pub payment_date:      Option<NaiveDate>,
    pub method:            Option<String>,
    pub reference:         Option<String>,
    pub notes:             Option<String>,
}
