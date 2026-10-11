use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
    pub upload_dir: String,
}

impl Config {
    pub fn from_env() -> Self {
        let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://data/taskflow.db?mode=rwc".to_string());
        let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "taskflow-super-secret-key-change-in-production-2026".to_string());
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8000);
        let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());

        Self {
            database_url,
            jwt_secret,
            port,
            upload_dir,
        }
    }
}
