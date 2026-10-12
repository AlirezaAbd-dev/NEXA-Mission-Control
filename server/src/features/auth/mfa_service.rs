use super::{mfa_repository as repo, repository::AuthRepository};
use crate::{error::AppError, state::AppState};
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use base64::{engine::general_purpose::STANDARD, Engine};
use hmac::{Hmac, Mac};
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
fn random<const N: usize>() -> [u8; N] {
    let mut bytes = [0u8; N];
    rand_core::RngCore::fill_bytes(&mut rand_core::OsRng, &mut bytes);
    bytes
}
pub fn initialize_key(cfg: &crate::config::Config) -> Result<(), AppError> {
    if let Ok(key)=std::env::var("MFA_ENCRYPTION_KEY"){
        if !key.trim().is_empty(){
            if key.trim().len()<32{return Err(AppError::Validation("MFA_ENCRYPTION_KEY must contain at least 32 characters".into()));}
            return Ok(());
        }
    }
    if cfg.database_url.contains(":memory:") {
        return Ok(());
    }
    let db_path = cfg
        .database_url
        .trim_start_matches("sqlite://")
        .trim_start_matches("sqlite:")
        .split('?')
        .next()
        .unwrap_or("data/mission-control.db");
    let path = std::path::Path::new(db_path)
        .parent()
        .unwrap_or_else(|| std::path::Path::new("data"))
        .join("local-mfa.key");
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|_| AppError::Internal("Cannot create authenticator key directory".into()))?;
    }
    if !path.exists() {
        use std::io::Write;
        let mut options = std::fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options
            .open(&path)
            .map_err(|_| AppError::Internal("Cannot create authenticator encryption key".into()))?;
        let key = random::<32>()
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<String>();
        file.write_all(key.as_bytes())
            .map_err(|_| AppError::Internal("Cannot store authenticator encryption key".into()))?;
    }
    let key = std::fs::read_to_string(path)
        .map_err(|_| AppError::Internal("Cannot read authenticator encryption key".into()))?;
    if key.trim().len() < 32 {
        return Err(AppError::Internal(
            "Authenticator encryption key is invalid".into(),
        ));
    }
    std::env::set_var("MFA_ENCRYPTION_KEY", key.trim());
    Ok(())
}
fn key(s: &AppState) -> Result<LessSafeKey, AppError> {
    let secret =
        std::env::var("MFA_ENCRYPTION_KEY").unwrap_or_else(|_| s.config.jwt_secret.clone());
    let bytes = Sha256::digest(secret.as_bytes());
    Ok(LessSafeKey::new(
        UnboundKey::new(&AES_256_GCM, &bytes)
            .map_err(|_| AppError::Internal("Cannot initialize authenticator encryption".into()))?,
    ))
}
fn encrypt(s: &AppState, user: &str, secret: &[u8]) -> Result<String, AppError> {
    let nonce = random::<12>();
    let mut bytes = secret.to_vec();
    key(s)?
        .seal_in_place_append_tag(
            Nonce::assume_unique_for_key(nonce),
            Aad::from(user),
            &mut bytes,
        )
        .map_err(|_| AppError::Internal("Cannot encrypt authenticator secret".into()))?;
    let mut envelope = nonce.to_vec();
    envelope.extend(bytes);
    Ok(STANDARD.encode(envelope))
}
fn decrypt(s: &AppState, user: &str, secret: &str) -> Result<Vec<u8>, AppError> {
    let mut envelope = STANDARD
        .decode(secret)
        .map_err(|_| AppError::Internal("Invalid authenticator configuration".into()))?;
    if envelope.len() < 28 {
        return Err(AppError::Internal(
            "Invalid authenticator configuration".into(),
        ));
    }
    let nonce: [u8; 12] = envelope[..12]
        .try_into()
        .map_err(|_| AppError::Internal("Invalid nonce".into()))?;
    let bytes = key(s)?
        .open_in_place(
            Nonce::assume_unique_for_key(nonce),
            Aad::from(user),
            &mut envelope[12..],
        )
        .map_err(|_| AppError::Internal("Cannot decrypt authenticator configuration".into()))?;
    Ok(bytes.to_vec())
}
fn base32(bytes: &[u8]) -> String {
    let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut result = String::new();
    let mut buffer = 0u32;
    let mut bits = 0;
    for byte in bytes {
        buffer = (buffer << 8) | u32::from(*byte);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            result.push(alphabet[((buffer >> bits) & 31) as usize] as char);
        }
    }
    if bits > 0 {
        result.push(alphabet[((buffer << (5 - bits)) & 31) as usize] as char);
    }
    result
}
fn code(secret: &[u8], counter: i64) -> Result<String, AppError> {
    let mut mac = Hmac::<sha1::Sha1>::new_from_slice(secret)
        .map_err(|_| AppError::Internal("Invalid authenticator secret".into()))?;
    mac.update(&(counter as u64).to_be_bytes());
    let digest = mac.finalize().into_bytes();
    let offset = (digest[19] & 15) as usize;
    let binary = u32::from_be_bytes(
        digest[offset..offset + 4]
            .try_into()
            .map_err(|_| AppError::Internal("Invalid OTP digest".into()))?,
    ) & 0x7fff_ffff;
    Ok(format!("{:06}", binary % 1_000_000))
}
fn match_counter(secret: &[u8], otp: &str) -> Result<Option<i64>, AppError> {
    if otp.len() != 6 || !otp.bytes().all(|b| b.is_ascii_digit()) {
        return Ok(None);
    }
    let current = chrono::Utc::now().timestamp() / 30;
    for n in [current, current - 1, current + 1] {
        let expected = code(secret, n)?;
        let mismatch = expected
            .bytes()
            .zip(otp.bytes())
            .fold(0u8, |n, (a, b)| n | (a ^ b));
        if mismatch == 0 {
            return Ok(Some(n));
        }
    }
    Ok(None)
}
async fn password(s: &AppState, user: &str, password: &str) -> Result<(), AppError> {
    let user = AuthRepository::find_by_id(&s.pool, user)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Account unavailable".into()))?;
    let hash = PasswordHash::new(&user.password_hash)
        .map_err(|_| AppError::Internal("Invalid password hash".into()))?;
    Argon2::default()
        .verify_password(password.as_bytes(), &hash)
        .map_err(|_| AppError::Validation("Current password is incorrect".into()))
}
pub async fn status(s: &AppState, user: &str) -> Result<Value, AppError> {
    Ok(json!({"enabled":repo::get(&s.pool,user).await?.is_some_and(|m|m.enabled==1)}))
}
pub async fn setup(s: &AppState, user: &str, pw: &str) -> Result<Value, AppError> {
    password(s, user, pw).await?;
    if repo::get(&s.pool, user)
        .await?
        .is_some_and(|m| m.enabled == 1)
    {
        return Err(AppError::Conflict(
            "Disable the current authenticator before replacing it".into(),
        ));
    }
    let bytes = random::<32>();
    let secret = base32(&bytes);
    repo::setup(&s.pool, user, &encrypt(s, user, &bytes)?).await?;
    Ok(
        json!({"secret":secret,"uri":format!("otpauth://totp/MissionControl:{user}?secret={secret}&issuer=MissionControl&algorithm=SHA1&digits=6&period=30")}),
    )
}
pub async fn enable(s: &AppState, user: &str, otp: &str) -> Result<Value, AppError> {
    let m = repo::get(&s.pool, user)
        .await?
        .ok_or_else(|| AppError::Validation("Start authenticator setup first".into()))?;
    if m.enabled == 1 || m.pending_until <= chrono::Utc::now().timestamp() {
        return Err(AppError::Validation(
            "Authenticator setup expired or already enabled".into(),
        ));
    }
    let secret = decrypt(s, user, &m.secret)?;
    let counter = match_counter(&secret, otp)?
        .ok_or_else(|| AppError::Validation("Invalid authenticator code".into()))?;
    let codes = (0..10)
        .map(|_| {
            random::<12>()
                .iter()
                .map(|b| format!("{b:02x}"))
                .collect::<String>()
        })
        .collect::<Vec<_>>();
    repo::enable(
        &s.pool,
        user,
        counter,
        codes
            .iter()
            .map(|code| format!("{:x}", Sha256::digest(code.as_bytes())))
            .collect(),
    )
    .await?;
    Ok(json!({"recovery_codes":codes}))
}
pub async fn verify_login(s: &AppState, user: &str, otp: Option<&str>) -> Result<(), AppError> {
    let Some(m) = repo::get(&s.pool, user).await? else {
        return Ok(());
    };
    if m.enabled == 0 {
        return Ok(());
    }
    let otp = otp.unwrap_or("").trim();
    if otp.is_empty() {
        return Err(AppError::Validation(
            "Enter your authenticator or recovery code".into(),
        ));
    }
    if m.locked_until > chrono::Utc::now().timestamp() {
        return Err(AppError::Validation(
            "Too many authenticator attempts. Try again in five minutes".into(),
        ));
    }
    if otp.len() == 24
        && repo::recovery(
            &s.pool,
            user,
            &format!("{:x}", Sha256::digest(otp.as_bytes())),
        )
        .await?
    {
        return Ok(());
    }
    let secret = decrypt(s, user, &m.secret)?;
    if let Some(counter) = match_counter(&secret, otp)? {
        if counter > m.last_counter && repo::accept_counter(&s.pool, user, counter).await? {
            return Ok(());
        }
    }
    repo::fail(&s.pool, user).await?;
    Err(AppError::Validation(
        "Invalid or already used authenticator code".into(),
    ))
}
pub async fn disable(s: &AppState, user: &str, pw: &str, otp: &str) -> Result<Value, AppError> {
    password(s, user, pw).await?;
    verify_login(s, user, Some(otp)).await?;
    repo::disable(&s.pool, user).await?;
    Ok(json!({"enabled":false}))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rfc4226_vectors() {
        assert_eq!(code(b"12345678901234567890", 0).unwrap(), "755224");
        assert_eq!(code(b"12345678901234567890", 1).unwrap(), "287082");
        assert_eq!(base32(b"foobar"), "MZXW6YTBOI");
    }
}
