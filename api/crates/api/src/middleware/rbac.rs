use crate::error::{AppError, Result};
use domain::Claims;

/// Check that the authenticated user has one of the allowed roles.
/// Call this at the top of any handler that needs role enforcement.
///
/// ```rust
/// require_role(&claims, &["admin"])?;
/// ```
pub fn require_role(claims: &Claims, allowed: &[&str]) -> Result<()> {
    if allowed.contains(&claims.role.as_str()) {
        Ok(())
    } else {
        Err(AppError::Forbidden(format!(
            "Role '{}' does not have permission for this action",
            claims.role
        )))
    }
}

// ---------------------------------------------------------------------------
// Role constants — single source of truth for allowed-role lists
// ---------------------------------------------------------------------------

pub const ADMIN: &[&str] = &["admin"];

pub const ADMIN_PLANNER: &[&str] = &["admin", "planner"];

pub const ADMIN_PLANNER_SUPERVISOR: &[&str] = &["admin", "planner", "supervisor"];

pub const SALES_ROLES: &[&str] = &["admin", "sales", "planner", "supervisor"];

pub const PURCHASING_ROLES: &[&str] = &["admin", "purchasing", "planner"];

pub const WAREHOUSE_ROLES: &[&str] = &["admin", "warehouse", "purchasing", "supervisor", "planner", "qc"];

pub const PRODUCTION_ROLES: &[&str] = &["admin", "planner", "supervisor", "subcontractor", "qc"];

pub const FINANCE_ROLES: &[&str] = &["admin", "sales"];
