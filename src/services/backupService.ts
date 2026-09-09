// ==========================================================
// src/services/backupService.ts
// خدمة إدارة النسخ الاحتياطي واسترجاع قاعدة البيانات
// ==========================================================

import { isRunningInTauri } from "@/database/adapter";
import { activityLogRepository } from "@/database/repositories/activityLogRepository";
import { getDatabase } from "@/database/connection";
import { BackupRow } from "@/types/database";

export class BackupService {
  async getAppDir(): Promise<string> {
    if (isRunningInTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        return await invoke<string>("get_app_dir");
      } catch (e) {
        console.warn("فشل get_app_dir:", e);
      }
    }
    return "AppData/StoreManager/";
  }

  async createBackup(userId: string, targetDir?: string): Promise<string> {
    let backupPath = "";

    if (isRunningInTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        backupPath = await invoke<string>("backup_database", { targetDir });
      } catch (e) {
        throw new Error(`فشل إنشاء النسخة الاحتياطية: ${e}`);
      }
    } else {
      // Browser simulator: serialize current DB tables into a downloadable JSON or simulated file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupPath = `store_backup_${timestamp}.json`;
    }

    // Record in backups table
    const db = await getDatabase();
    const backupId = `bk-${Date.now()}`;
    await db.execute(
      `INSERT INTO backups (id, filename, filepath, size_bytes, backup_type, status) 
       VALUES (?, ?, ?, 1024000, 'MANUAL', 'SUCCESS')`,
      [backupId, backupPath.split(/[\\/]/).pop() || backupPath, backupPath]
    );

    // Log in activity
    await activityLogRepository.log(
      userId,
      "BACKUP",
      `تم إنشاء نسخة احتياطية جديدة لقاعدة البيانات: ${backupPath}`,
      "BACKUP",
      backupId
    );

    return backupPath;
  }

  async restoreBackup(userId: string, backupFilePath: string): Promise<string> {
    if (isRunningInTauri()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const msg = await invoke<string>("restore_database", { backupFilePath });

        await activityLogRepository.log(
          userId,
          "RESTORE",
          `تم استرجاع قاعدة البيانات من الملف: ${backupFilePath}`,
          "BACKUP",
          backupFilePath
        );

        return msg;
      } catch (e) {
        throw new Error(`فشل استرجاع النسخة الاحتياطية: ${e}`);
      }
    } else {
      return "تمت محاكاة استرجاع البيانات بنجاح.";
    }
  }

  async listBackups(): Promise<BackupRow[]> {
    const db = await getDatabase();
    return await db.select<BackupRow[]>(`SELECT * FROM backups ORDER BY created_at DESC`);
  }
}

export const backupService = new BackupService();
