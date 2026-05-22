use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Company {
    pub id:                      Uuid,
    pub code:                    String,
    pub name:                    String,
    pub country_id:              Option<Uuid>,
    pub address:                 Option<String>,
    pub base_currency:           String,
    pub fiscal_year_start_month: i32,
    pub registration_number:     Option<String>,
    pub tax_id:                  Option<String>,
    pub logo_url:                Option<String>,
    pub parent_company_id:       Option<Uuid>,
    pub is_active:               bool,
    pub created_at:              DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCompany {
    pub code:                    String,
    pub name:                    String,
    pub country_id:              Option<Uuid>,
    pub address:                 Option<String>,
    #[serde(default = "default_currency")]
    pub base_currency:           String,
    #[serde(default = "default_fy_month")]
    pub fiscal_year_start_month: i32,
    pub registration_number:     Option<String>,
    pub tax_id:                  Option<String>,
    pub logo_url:                Option<String>,
    pub parent_company_id:       Option<Uuid>,
}

fn default_currency() -> String { "THB".to_string() }
fn default_fy_month() -> i32 { 1 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompany {
    pub name:                    Option<String>,
    pub country_id:              Option<Uuid>,
    pub address:                 Option<String>,
    pub base_currency:           Option<String>,
    pub fiscal_year_start_month: Option<i32>,
    pub registration_number:     Option<String>,
    pub tax_id:                  Option<String>,
    pub logo_url:                Option<String>,
    pub parent_company_id:       Option<Uuid>,
    pub is_active:               Option<bool>,
}

// ---------------------------------------------------------------------------
// Company Group
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CompanyGroup {
    pub id:          Uuid,
    pub name:        String,
    pub description: Option<String>,
    pub created_at:  DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCompanyGroup {
    pub name:        String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompanyGroup {
    pub name:        Option<String>,
    pub description: Option<String>,
}

// ---------------------------------------------------------------------------
// Company Group Membership
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CompanyGroupMember {
    pub group_id:   Uuid,
    pub company_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddCompanyToGroup {
    pub company_id: Uuid,
}

// ---------------------------------------------------------------------------
// User-Company (per-company role assignment)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserCompany {
    pub user_id:    Uuid,
    pub company_id: Uuid,
    pub role:       String,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddUserToCompany {
    pub user_id:    Uuid,
    pub role:       String,
    #[serde(default)]
    pub is_primary: bool,
}
