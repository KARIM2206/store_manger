// ==========================================================
// src/database/repositories/inventoryRepository.ts
// مستودع بيانات المخزون وسجل حركات المخزون (Ledger)
// ==========================================================

import { getDatabase } from "../connection";
import { StockMovementRow, StockMovementType, ProductRow } from "@/types/database";

export interface StockAdjustmentDTO {
  productId: string;
  type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantity: number;
  reason: string;
  userId: string;
}

export interface IInventoryRepository {
  getMovements(productId?: string, limit?: number): Promise<StockMovementRow[]>;
  adjustStock(dto: StockAdjustmentDTO): Promise<StockMovementRow>;
  getInventoryStatus(): Promise<{
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    items: (ProductRow & { status: "متوفر" | "منخفض" | "نفد" })[];
  }>;
}

export class SQLiteInventoryRepository implements IInventoryRepository {
  async getMovements(productId?: string, limit: number = 100): Promise<StockMovementRow[]> {
    const db = await getDatabase();
    let query = `
      SELECT m.*, p.name as product_name, u.full_name as user_name 
      FROM stock_movements m 
      LEFT JOIN products p ON m.product_id = p.id 
      LEFT JOIN users u ON m.user_id = u.id
    `;
    const params: any[] = [];

    if (productId) {
      query += ` WHERE m.product_id = ?`;
      params.push(productId);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ${limit}`;
    return await db.select<StockMovementRow[]>(query, params);
  }

  async adjustStock(dto: StockAdjustmentDTO): Promise<StockMovementRow> {
    const db = await getDatabase();

    // Run atomically in transaction
    return await db.transaction(async (tx) => {
      const products = await tx.select<ProductRow[]>(
        `SELECT * FROM products WHERE id = ? LIMIT 1`,
        [dto.productId]
      );
      if (products.length === 0) {
        throw new Error("المنتج غير موجود لتسوية المخزون");
      }

      const product = products[0];
      const beforeQty = Number(product.current_stock);
      let afterQty = beforeQty;

      if (dto.type === "ADJUSTMENT_IN") {
        afterQty = beforeQty + Number(dto.quantity);
      } else if (dto.type === "ADJUSTMENT_OUT") {
        afterQty = beforeQty - Number(dto.quantity);
        if (afterQty < 0) {
          // Check settings
          const settings = await tx.select<{ value: string }[]>(
            `SELECT value FROM settings WHERE key = 'allow_negative_stock' LIMIT 1`
          );
          const allowNegative = settings.length > 0 && settings[0].value === "true";
          if (!allowNegative) {
            throw new Error(`الكمية المتاحة (${beforeQty}) أقل من المطلوب سحبه (${dto.quantity})`);
          }
        }
      }

      const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      // 1. Record ledger movement
      await tx.execute(
        `INSERT INTO stock_movements (
          id, product_id, type, quantity, before_quantity, after_quantity, reason, reference_type, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'MANUAL_ADJUSTMENT', ?)`,
        [
          movementId,
          dto.productId,
          dto.type,
          dto.quantity,
          beforeQty,
          afterQty,
          dto.reason,
          dto.userId,
        ]
      );

      // 2. Update current stock in product table
      await tx.execute(
        `UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [afterQty, dto.productId]
      );

      // 3. Log notification if low or out of stock
      if (afterQty === 0) {
        await tx.execute(
          `INSERT INTO notifications (id, title, message, type, is_read, reference_type, reference_id) 
           VALUES (?, ?, ?, 'OUT_OF_STOCK', 0, 'PRODUCT', ?)`,
          [`notif-${Date.now()}`, "نفاد المخزون", `المنتج "${product.name}" نفد تماماً من المخزن`, product.id]
        );
      } else if (afterQty <= product.minimum_stock) {
        await tx.execute(
          `INSERT INTO notifications (id, title, message, type, is_read, reference_type, reference_id) 
           VALUES (?, ?, ?, 'LOW_STOCK', 0, 'PRODUCT', ?)`,
          [
            `notif-${Date.now()}`,
            "تنبيه: مخزون منخفض",
            `المنتج "${product.name}" وصل إلى الحد الأدنى (${afterQty})`,
            product.id,
          ]
        );
      }

      return {
        id: movementId,
        product_id: dto.productId,
        type: dto.type,
        quantity: dto.quantity,
        before_quantity: beforeQty,
        after_quantity: afterQty,
        reason: dto.reason,
        reference_type: "MANUAL_ADJUSTMENT",
        reference_id: null,
        user_id: dto.userId,
        created_at: new Date().toISOString(),
        product_name: product.name,
      };
    });
  }

  async getInventoryStatus(): Promise<{
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    items: (ProductRow & { status: "متوفر" | "منخفض" | "نفد" })[];
  }> {
    const db = await getDatabase();
    const products = await db.select<ProductRow[]>(
      `SELECT p.*, c.name as category_name, u.symbol as unit_symbol 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       LEFT JOIN units u ON p.unit_id = u.id 
       WHERE p.is_active = 1 
       ORDER BY p.current_stock ASC`
    );

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const items = products.map((p) => {
      const stock = Number(p.current_stock);
      const min = Number(p.minimum_stock);
      const purchasePrice = Number(p.purchase_price);

      totalStockValue += stock * purchasePrice;

      let status: "متوفر" | "منخفض" | "نفد" = "متوفر";
      if (stock <= 0) {
        status = "نفد";
        outOfStockCount++;
      } else if (stock <= min) {
        status = "منخفض";
        lowStockCount++;
      }

      return {
        ...p,
        status,
      };
    });

    return {
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      items,
    };
  }
}

export const inventoryRepository = new SQLiteInventoryRepository();
