use chrono::Local;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_app_dir(app: AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("فشل تحديد مسار بيانات التطبيق: {}", e))?;

    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("فشل إنشاء مجلد بيانات التطبيق: {}", e))?;
    }

    Ok(app_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn backup_database(app: AppHandle, target_dir: Option<String>) -> Result<String, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("فشل تحديد مسار البيانات: {}", e))?;

    let db_path = app_data.join("store.db");

    let dest_dir = match target_dir {
        Some(dir) => PathBuf::from(dir),
        None => {
            let backup_dir = app_data.join("backups");
            if !backup_dir.exists() {
                fs::create_dir_all(&backup_dir)
                    .map_err(|e| format!("فشل إنشاء مجلد النسخ الاحتياطي: {}", e))?;
            }
            backup_dir
        }
    };

    if !db_path.exists() {
        return Err("ملف قاعدة البيانات غير موجود بعد للنسخ الاحتياطي".to_string());
    }

    let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
    let backup_filename = format!("store_backup_{}.db", timestamp);
    let backup_path = dest_dir.join(&backup_filename);

    fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("فشل إنشاء النسخة الاحتياطية: {}", e))?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn restore_database(app: AppHandle, backup_file_path: String) -> Result<String, String> {
    let src = Path::new(&backup_file_path);
    if !src.exists() {
        return Err("ملف النسخة الاحتياطية المحدد غير موجود".to_string());
    }

    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("فشل تحديد مسار البيانات: {}", e))?;

    let db_path = app_data.join("store.db");
    let safety_dir = app_data.join("safety_backups");
    if !safety_dir.exists() {
        fs::create_dir_all(&safety_dir)
            .map_err(|e| format!("فشل إنشاء مجلد النسخ الاحتياطي للأمان: {}", e))?;
    }

    // Always create a safety backup before restoring!
    if db_path.exists() {
        let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
        let safety_filename = format!("safety_before_restore_{}.db", timestamp);
        let safety_path = safety_dir.join(&safety_filename);
        fs::copy(&db_path, &safety_path)
            .map_err(|e| format!("فشل إنشاء نسخة الأمان الاحتياطية قبل الاستعادة: {}", e))?;
    }

    // Now overwrite store.db with the backup
    fs::copy(src, &db_path)
        .map_err(|e| format!("فشل استرجاع قاعدة البيانات من الملف: {}", e))?;

    Ok("تم استرجاع النسخة الاحتياطية بنجاح. يرجى إعادة تشغيل البرنامج للتأكيد.".to_string())
}

#[tauri::command]
pub fn list_backups(app: AppHandle) -> Result<Vec<String>, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("فشل تحديد مسار البيانات: {}", e))?;

    let backup_dir = app_data.join("backups");
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();
    if let Ok(entries) = fs::read_dir(backup_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".db") {
                    backups.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }
    backups.sort();
    backups.reverse();
    Ok(backups)
}
