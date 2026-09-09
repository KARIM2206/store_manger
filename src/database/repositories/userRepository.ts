// ==========================================================
// src/database/repositories/userRepository.ts
// مستودع بيانات المستخدمين والأدوار والصلاحيات
// ==========================================================

import { getDatabase } from "../connection";
import { UserRow, RoleRow, PermissionRow } from "@/types/database";

export interface UserWithRoleDTO extends UserRow {
  role_name?: string;
  role_name_ar?: string;
  permissions?: string[];
}

export interface IUserRepository {
  getAll(): Promise<UserWithRoleDTO[]>;
  getById(id: string): Promise<UserWithRoleDTO | null>;
  getByUsername(username: string): Promise<UserWithRoleDTO | null>;
  getRoles(): Promise<RoleRow[]>;
  getPermissions(): Promise<PermissionRow[]>;
  getRolePermissions(roleId: string): Promise<string[]>;
  create(user: Omit<UserRow, "id" | "last_login_at" | "created_at" | "updated_at">): Promise<UserRow>;
  update(id: string, data: Partial<UserRow>): Promise<UserRow>;
  delete(id: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
  hasAnyUsers(): Promise<boolean>;
}

export class SQLiteUserRepository implements IUserRepository {
  async getAll(): Promise<UserWithRoleDTO[]> {
    const db = await getDatabase();
    const users = await db.select<UserRow[]>(
      `SELECT u.*, r.name as role_name, r.name_ar as role_name_ar 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.is_active = 1 
       ORDER BY u.created_at ASC`
    );

    const result: UserWithRoleDTO[] = [];
    for (const u of users) {
      const perms = await this.getRolePermissions(u.role_id);
      result.push({
        ...u,
        permissions: perms,
      });
    }
    return result;
  }

  async getById(id: string): Promise<UserWithRoleDTO | null> {
    const db = await getDatabase();
    const rows = await db.select<UserRow[]>(
      `SELECT u.*, r.name as role_name, r.name_ar as role_name_ar 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return null;

    const user = rows[0];
    const permissions = await this.getRolePermissions(user.role_id);
    return {
      ...user,
      permissions,
    };
  }

  async getByUsername(username: string): Promise<UserWithRoleDTO | null> {
    const db = await getDatabase();
    const rows = await db.select<UserRow[]>(
      `SELECT u.*, r.name as role_name, r.name_ar as role_name_ar 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.username = ? AND u.is_active = 1 LIMIT 1`,
      [username]
    );
    if (rows.length === 0) return null;

    const user = rows[0];
    const permissions = await this.getRolePermissions(user.role_id);
    return {
      ...user,
      permissions,
    };
  }

  async getRoles(): Promise<RoleRow[]> {
    const db = await getDatabase();
    return await db.select<RoleRow[]>(`SELECT * FROM roles ORDER BY is_system DESC, name ASC`);
  }

  async getPermissions(): Promise<PermissionRow[]> {
    const db = await getDatabase();
    return await db.select<PermissionRow[]>(`SELECT * FROM permissions ORDER BY module ASC, code ASC`);
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.select<{ permission_code: string }[]>(
      `SELECT permission_code FROM role_permissions WHERE role_id = ?`,
      [roleId]
    );
    return rows.map((r) => r.permission_code);
  }

  async create(user: Omit<UserRow, "id" | "last_login_at" | "created_at" | "updated_at">): Promise<UserRow> {
    const db = await getDatabase();
    const id = `user-${Date.now()}`;

    await db.execute(
      `INSERT INTO users (id, username, full_name, password_hash, role_id, phone, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, user.username, user.full_name, user.password_hash, user.role_id, user.phone || null, 1]
    );

    const created = await this.getById(id);
    if (!created) throw new Error("تعذر جلب المستخدم بعد إنشائه");
    return created;
  }

  async update(id: string, data: Partial<UserRow>): Promise<UserRow> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error("المستخدم غير موجود للتعديل");

    await db.execute(
      `UPDATE users SET 
        full_name = ?, 
        role_id = ?, 
        phone = ?, 
        password_hash = ?, 
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        data.full_name ?? existing.full_name,
        data.role_id ?? existing.role_id,
        data.phone !== undefined ? data.phone : existing.phone,
        data.password_hash ?? existing.password_hash,
        id,
      ]
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error("تعذر جلب بيانات المستخدم بعد التعديل");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  async updateLastLogin(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  async hasAnyUsers(): Promise<boolean> {
    const users = await this.getAll();
    return users.length > 0;
  }
}

export const userRepository = new SQLiteUserRepository();
