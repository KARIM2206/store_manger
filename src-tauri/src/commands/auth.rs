use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

#[tauri::command]
pub fn hash_password(password: String) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    match argon2.hash_password(password.as_bytes(), &salt) {
        Ok(hash) => Ok(hash.to_string()),
        Err(e) => Err(format!("فشل تشفير كلمة المرور: {}", e)),
    }
}

#[tauri::command]
pub fn verify_password(password: String, hash: String) -> Result<bool, String> {
    match PasswordHash::new(&hash) {
        Ok(parsed_hash) => {
            let argon2 = Argon2::default();
            Ok(argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok())
        }
        Err(e) => Err(format!("تنسيق كلمة المرور غير صالح: {}", e)),
    }
}
