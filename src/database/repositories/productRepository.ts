// ==========================================================
// src/database/repositories/productRepository.ts
// مستودع بيانات المنتجات
// ==========================================================

import { getDatabase } from "../connection";
import { ProductRow } from "@/types/database";

export interface CreateProductDTO {
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category_id: string;
  unit_id: string;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  maximum_stock?: number | null;
  initial_stock?: number;
  description?: string | null;
  notes?: string | null;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  is_active?: number;
}

export interface IProductRepository {
  getAll(): Promise<ProductRow[]>;
  getById(id: string): Promise<ProductRow | null>;
  getBySku(sku: string): Promise<ProductRow | null>;
  getByBarcode(barcode: string): Promise<ProductRow | null>;
  create(data: CreateProductDTO, userId: string): Promise<ProductRow>;
  update(id: string, data: UpdateProductDTO): Promise<ProductRow>;
  delete(id: string): Promise<void>;
  updateStock(id: string, newStock: number): Promise<void>;
}

export class SQLiteProductRepository implements IProductRepository {
  async getAll(): Promise<ProductRow[]> {
    const db = await getDatabase();
    const rows = await db.select<ProductRow[]>(
      `SELECT p.*, c.name as category_name, u.name as unit_name, u.symbol as unit_symbol 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       LEFT JOIN units u ON p.unit_id = u.id 
       WHERE p.is_active = 1 
       ORDER BY p.name ASC`
    );
    return rows;
  }

  async getById(id: string): Promise<ProductRow | null> {
    const db = await getDatabase();
    const rows = await db.select<ProductRow[]>(
      `SELECT p.*, c.name as category_name, u.name as unit_name, u.symbol as unit_symbol 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       LEFT JOIN units u ON p.unit_id = u.id 
       WHERE p.id = ? LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getBySku(sku: string): Promise<ProductRow | null> {
    const db = await getDatabase();
    const rows = await db.select<ProductRow[]>(
      `SELECT p.*, c.name as category_name, u.name as unit_name, u.symbol as unit_symbol 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       LEFT JOIN units u ON p.unit_id = u.id 
       WHERE p.sku = ? LIMIT 1`,
      [sku]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getByBarcode(barcode: string): Promise<ProductRow | null> {
    const db = await getDatabase();
    const rows = await db.select<ProductRow[]>(
      `SELECT p.*, c.name as category_name, u.name as unit_name, u.symbol as unit_symbol 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       LEFT JOIN units u ON p.unit_id = u.id 
       WHERE p.barcode = ? LIMIT 1`,
      [barcode]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async create(data: CreateProductDTO, userId: string): Promise<ProductRow> {
    const db = await getDatabase();
    const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const current_stock = data.initial_stock || 0;

    await db.execute(
      `INSERT INTO products (
        id, name, sku, barcode, category_id, unit_id, 
        purchase_price, selling_price, minimum_stock, maximum_stock, 
        current_stock, description, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        data.name,
        data.sku || null,
        data.barcode || null,
        data.category_id,
        data.unit_id,
        data.purchase_price || 0,
        data.selling_price || 0,
        data.minimum_stock ?? 5,
        data.maximum_stock || null,
        current_stock,
        data.description || null,
        data.notes || null,
      ]
    );

    // Record stock movement if initial stock > 0
    if (current_stock > 0) {
      await db.execute(
        `INSERT INTO stock_movements (
          id, product_id, type, quantity, before_quantity, after_quantity, reason, reference_type, user_id
        ) VALUES (?, ?, 'ADJUSTMENT_IN', ?, 0, ?, 'رصيد افتتاحي عند إضافة المنتج', 'INITIAL', ?)`,
        [`mov-${Date.now()}`, id, current_stock, current_stock, userId]
      );
    }

    const created = await this.getById(id);
    if (!created) throw new Error("تعذر جلب المنتج بعد الإضافة");
    return created;
  }

  async update(id: string, data: UpdateProductDTO): Promise<ProductRow> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error("المنتج المراد تعديله غير موجود");

    await db.execute(
      `UPDATE products SET 
        name = ?, sku = ?, barcode = ?, category_id = ?, unit_id = ?, 
        purchase_price = ?, selling_price = ?, minimum_stock = ?, 
        maximum_stock = ?, description = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        data.name ?? existing.name,
        data.sku !== undefined ? data.sku : existing.sku,
        data.barcode !== undefined ? data.barcode : existing.barcode,
        data.category_id ?? existing.category_id,
        data.unit_id ?? existing.unit_id,
        data.purchase_price ?? existing.purchase_price,
        data.selling_price ?? existing.selling_price,
        data.minimum_stock ?? existing.minimum_stock,
        data.maximum_stock !== undefined ? data.maximum_stock : existing.maximum_stock,
        data.description !== undefined ? data.description : existing.description,
        data.notes !== undefined ? data.notes : existing.notes,
        id,
      ]
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error("تعذر جلب المنتج بعد التعديل");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    // Soft delete to protect stock history integrity
    await db.execute(
      `UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  async updateStock(id: string, newStock: number): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStock, id]
    );
  }
}

export const productRepository = new SQLiteProductRepository();
