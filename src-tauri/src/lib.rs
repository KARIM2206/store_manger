mod commands;

use commands::auth::{hash_password, verify_password};
use commands::backup::{backup_database, get_app_dir, list_backups, restore_database};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            hash_password,
            verify_password,
            get_app_dir,
            backup_database,
            restore_database,
            list_backups,
        ])
        .run(tauri::generate_context!())
        .expect("حدث خطأ أثناء تشغيل تطبيق إدارة المخزون");
}
