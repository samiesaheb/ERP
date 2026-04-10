use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SearchResult {
    pub entity_type: String,
    pub id:          String,
    pub label:       String,
    pub sublabel:    Option<String>,
}
