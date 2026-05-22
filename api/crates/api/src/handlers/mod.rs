pub mod audit;
pub mod artwork;
pub mod auth;
pub mod company;
pub mod bom;
pub mod formulation;
pub mod dashboard;
pub mod finance;
pub mod inventory;
pub mod locations;
pub mod masters;
pub mod procurement;
pub mod production;
pub mod sales;
pub mod search;
pub mod shipments;
pub mod shop_floor;
pub mod tax;
pub mod warehouses;

use crate::error::{AppError, Result};
use domain::Claims;
use uuid::Uuid;

pub fn company_id_from_claims(claims: &Claims) -> Result<Uuid> {
    claims
        .company_id
        .as_deref()
        .ok_or_else(|| AppError::BadRequest("No company selected — please select a company first".into()))?
        .parse()
        .map_err(|_| AppError::BadRequest("Invalid company context".into()))
}
