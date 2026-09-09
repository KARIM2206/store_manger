// ==========================================================
// src/database/repositories/activityLogRepository.ts
// مستودع بيانات سجل النشاط ومراقبة العمليات الحساسة
// ==========================================================

import { getDatabase } from "../connection";
import { ActivityLogRow } from "@/types/database";

export interface IActivityLogRepository {
  getAll(limit?: number): Promise<ActivityLogRow[]>;
  log(
    userId: string,
    action: string,
    description: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<void>;
}

export class SQLiteActivityLogRepository implements IActivityLogRepository {
  async getAll(limit: number = 100): Promise<ActivityLogRow[]> {
    const db = await getDatabase();
    return await db.select<ActivityLogRow[]>(
      `SELECT a.*, u.full_name as user_name 
       FROM activity_logs a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC LIMIT ${limit}`
    );
  }

  async log(
    userId: string,
    action: string,
    description: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      const db = await getDatabase();
      const id = `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      await db.execute(
        `INSERT INTO activity_logs (
          id, user_id, action, entity_type, entity_id, description, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          action,
          entityType || null,
          entityId || null,
          description,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );
    } catch (e) {
      console.error("فشل تسجيل حركة في سجل النشاط:", e);
    }
  }
}

export const activityLogRepository = new SQLiteActivityLogRepository();
