// ==========================================================
// src/database/repositories/categoryRepository.ts
// مستودع بيانات التصنيفات
// ==========================================================

import { getDatabase } from "../connection";
import { CategoryRow } from "@/types/database";

export interface CategoryWithCount extends CategoryRow {
  products_count: number;
}

export interface ICategoryRepository {
  getAll(): Promise<CategoryWithCount[]>;
  getById(id: string): Promise<CategoryRow | null>;
  create(name: string, description?: string): Promise<CategoryRow>;
  update(id: string, name: string, description?: string): Promise<CategoryRow>;
  delete(id: string): Promise<void>;
  getProductsCount(id: string): Promise<number>;
}

export class SQLiteCategoryRepository implements ICategoryRepository {
  async getAll(): Promise<CategoryWithCount[]> {
    const db = await getDatabase();
    const categories = await db.select<CategoryRow[]>(
      `SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC`
    );

    const result: CategoryWithCount[] = [];
    for (const cat of categories) {
      const count = await this.getProductsCount(cat.id);
      result.push({
        ...cat,
        products_count: count,
      });
    }

    return result;
  }

  async getById(id: string): Promise<CategoryRow | null> {
    const db = await getDatabase();
    const rows = await db.select<CategoryRow[]>(
      `SELECT * FROM categories WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getProductsCount(id: string): Promise<number> {
    const db = await getDatabase();
    const rows = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1`,
      [id]
    );
    return rows.length > 0 ? Number(rows[0].count) : 0;
  }

  async create(name: string, description?: string): Promise<CategoryRow> {
    const db = await getDatabase();
    const id = `cat-${Date.now()}`;
    await db.execute(
      `INSERT INTO categories (id, name, description, is_active) VALUES (?, ?, ?, 1)`,
      [id, name, description || null]
    );
    const created = await this.getById(id);
    if (!created) throw new Error("تعذر جلب التصنيف بعد الإنشاء");
    return created;
  }

  async update(id: string, name: string, description?: string): Promise<CategoryRow> {
    const db = await getDatabase();
    await db.execute(
      `UPDATE categories SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, description || null, id]
    );
    const updated = await this.getById(id);
    if (!updated) throw new Error("تعذر جلب التصنيف بعد التعديل");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const count = await this.getProductsCount(id);
    if (count > 0) {
      throw new Error(
        `لا يمكن حذف هذا التصنيف لأنه يحتوي على ${count} منتج. قم بنقل المنتجات لتصنيف آخر أولاً.`
      );
    }

    const db = await getDatabase();
    await db.execute(
      `UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }
}

export const categoryRepository = new SQLiteCategoryRepository();
