use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db:                    PgPool,
    pub jwt_secret:            String,
    pub google_client_id:      Option<String>,
    pub google_client_secret:  Option<String>,
    /// Full redirect URI registered in Google Cloud Console
    /// e.g. http://localhost:8080/auth/google/callback
    pub google_redirect_uri:   Option<String>,
    /// Frontend origin — after OAuth completes the user is sent here
    /// e.g. http://localhost:3000
    pub frontend_url:          String,
}
