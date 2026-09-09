// ==========================================================
// src/database/repositories/settingsRepository.ts
// مستودع بيانات الإعدادات ومميزات النظام (Features)
// ==========================================================

import { getDatabase } from "../connection";
import { SettingRow, FeatureRow } from "@/types/database";

export interface ISettingsRepository {
  getAllSettings(): Promise<Record<string, string>>;
  getSetting(key: string, defaultValue?: string): Promise<string>;
  setSetting(key: string, value: string): Promise<void>;
  setManySettings(settings: Record<string, string>): Promise<void>;
  getAllFeatures(): Promise<FeatureRow[]>;
  toggleFeature(featureId: string, isEnabled: boolean): Promise<void>;
}

export class SQLiteSettingsRepository implements ISettingsRepository {
  async getAllSettings(): Promise<Record<string, string>> {
    const db = await getDatabase();
    const rows = await db.select<SettingRow[]>(`SELECT * FROM settings`);
    const dict: Record<string, string> = {};
    for (const r of rows) {
      dict[r.key] = r.value;
    }
    return dict;
  }

  async getSetting(key: string, defaultValue: string = ""): Promise<string> {
    const db = await getDatabase();
    const rows = await db.select<SettingRow[]>(
      `SELECT value FROM settings WHERE key = ? LIMIT 1`,
      [key]
    );
    return rows.length > 0 ? rows[0].value : defaultValue;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }

  async setManySettings(settings: Record<string, string>): Promise<void> {
    const db = await getDatabase();
    for (const [k, v] of Object.entries(settings)) {
      await db.execute(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [k, v]
      );
    }
  }

  async getAllFeatures(): Promise<FeatureRow[]> {
    const db = await getDatabase();
    return await db.select<FeatureRow[]>(`SELECT * FROM features ORDER BY is_core DESC, id ASC`);
  }

  async toggleFeature(featureId: string, isEnabled: boolean): Promise<void> {
    const db = await getDatabase();
    // Cannot disable core feature
    const feats = await db.select<FeatureRow[]>(
      `SELECT * FROM features WHERE id = ? LIMIT 1`,
      [featureId]
    );
    if (feats.length > 0 && feats[0].is_core === 1 && !isEnabled) {
      throw new Error("لا يمكن تعطيل الميزات الأساسية للنظام");
    }

    await db.execute(
      `UPDATE features SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [isEnabled ? 1 : 0, featureId]
    );
  }
}

export const settingsRepository = new SQLiteSettingsRepository();
