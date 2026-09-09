// ==========================================================
// src/database/repositories/notificationRepository.ts
// مستودع بيانات الإشعارات وتنبيهات النظام
// ==========================================================

import { getDatabase } from "../connection";
import { NotificationRow } from "@/types/database";

export interface INotificationRepository {
  getAll(limit?: number): Promise<NotificationRow[]>;
  getUnread(): Promise<NotificationRow[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  create(
    title: string,
    message: string,
    type: "LOW_STOCK" | "OUT_OF_STOCK" | "OPERATION" | "BACKUP" | "SYSTEM",
    referenceType?: string,
    referenceId?: string
  ): Promise<void>;
}

export class SQLiteNotificationRepository implements INotificationRepository {
  async getAll(limit: number = 50): Promise<NotificationRow[]> {
    const db = await getDatabase();
    return await db.select<NotificationRow[]>(
      `SELECT * FROM notifications ORDER BY created_at DESC LIMIT ${limit}`
    );
  }

  async getUnread(): Promise<NotificationRow[]> {
    const db = await getDatabase();
    return await db.select<NotificationRow[]>(
      `SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC`
    );
  }

  async markAsRead(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
  }

  async markAllAsRead(): Promise<void> {
    const db = await getDatabase();
    await db.execute(`UPDATE notifications SET is_read = 1 WHERE is_read = 0`);
  }

  async create(
    title: string,
    message: string,
    type: "LOW_STOCK" | "OUT_OF_STOCK" | "OPERATION" | "BACKUP" | "SYSTEM",
    referenceType?: string,
    referenceId?: string
  ): Promise<void> {
    const db = await getDatabase();
    const id = `notif-${Date.now()}`;
    await db.execute(
      `INSERT INTO notifications (id, title, message, type, is_read, reference_type, reference_id) 
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [id, title, message, type, referenceType || null, referenceId || null]
    );
  }
}

export const notificationRepository = new SQLiteNotificationRepository();
