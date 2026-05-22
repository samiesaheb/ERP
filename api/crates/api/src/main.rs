mod error;
mod handlers;
mod middleware;
mod routes;
mod state;

use std::net::SocketAddr;

use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, AllowOrigin, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env (dev only — Railway injects env vars directly)
    let _ = dotenvy::dotenv();

    // Tracing
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Config from env
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set");
    let allowed_origin = std::env::var("ALLOWED_ORIGIN")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    let frontend_url         = std::env::var("FRONTEND_URL")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    let google_client_id     = std::env::var("GOOGLE_CLIENT_ID").ok();
    let google_client_secret = std::env::var("GOOGLE_CLIENT_SECRET").ok();
    let google_redirect_uri  = std::env::var("GOOGLE_REDIRECT_URI").ok();
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    // Database pool
    let db = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await?;

    // Run migrations
    sqlx::migrate!("../db/migrations")
        .run(&db)
        .await?;

    tracing::info!("Migrations applied");

    let state = AppState {
        db,
        jwt_secret,
        google_client_id,
        google_client_secret,
        google_redirect_uri,
        frontend_url,
    };

    // CORS — ALLOWED_ORIGIN may be a comma-separated list of origins
    let allow_origin: AllowOrigin = {
        let origins: Vec<axum::http::HeaderValue> = allowed_origin
            .split(',')
            .map(|s| s.trim().parse::<axum::http::HeaderValue>().expect("Invalid ALLOWED_ORIGIN entry"))
            .collect();
        AllowOrigin::list(origins)
    };
    let cors = CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(false);

    let app = routes::build_router(state).layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("SkyHigh MES API listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
