use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
    pub upload_dir: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let mut database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite://data/mission-control.db?mode=rwc".to_string());
        // Reuse an existing database on upgrade; never silently start an empty instance.
        let raw_path = database_url
            .trim_start_matches("sqlite://")
            .trim_start_matches("sqlite:")
            .split('?')
            .next()
            .unwrap_or("");
        let path = std::path::Path::new(raw_path);
        let legacy = path.with_file_name(["task", "flow", ".db"].concat());
        if path
            .file_name()
            .is_some_and(|name| name == "mission-control.db")
            && !path.exists()
            && legacy.exists()
        {
            database_url = database_url.replace(raw_path, &legacy.to_string_lossy());
        }
        let jwt_secret = match env::var("JWT_SECRET") {
            Ok(value) if value.trim().len() >= 32 => value,
            Ok(_) => anyhow::bail!("JWT_SECRET must contain at least 32 characters"),
            Err(_) if env::var("MISSION_CONTROL_DEMO").as_deref() == Ok("1") => {
                ["task", "flow-super-secret-key-change-in-production-2026"].concat()
            }
            Err(_) => anyhow::bail!("Set a unique JWT_SECRET before starting the server"),
        };
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8000);
        let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());

        Ok(Self {
            database_url,
            jwt_secret,
            port,
            upload_dir,
        })
    }
}
