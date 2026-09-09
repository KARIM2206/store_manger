// ==========================================================
// src/database/repositories/purchaseRepository.ts
// مستودع بيانات المشتريات وفواتير التوريد
// ==========================================================

import { getDatabase } from "../connection";
import { PurchaseRow, PurchaseItemRow, ProductRow, SupplierRow } from "@/types/database";

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreatePurchaseDTO {
  supplierId?: string | null;
  userId: string;
  items: PurchaseItemInput[];
  discount?: number;
  paymentType: "CASH" | "CREDIT" | "PARTIAL";
  paidAmount?: number;
  notes?: string | null;
}

export interface IPurchaseRepository {
  getAll(limit?: number): Promise<PurchaseRow[]>;
  getById(id: string): Promise<(PurchaseRow & { items: PurchaseItemRow[] }) | null>;
  createPurchase(dto: CreatePurchaseDTO): Promise<PurchaseRow>;
  getTodayPurchasesTotal(): Promise<number>;
}

export class SQLitePurchaseRepository implements IPurchaseRepository {
  async getAll(limit: number = 100): Promise<PurchaseRow[]> {
    const db = await getDatabase();
    return await db.select<PurchaseRow[]>(
      `SELECT p.*, s.name as supplier_name, u.full_name as user_name,
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as items_count 
       FROM purchases p 
       LEFT JOIN suppliers s ON p.supplier_id = s.id 
       LEFT JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC LIMIT ${limit}`
    );
  }

  async getById(id: string): Promise<(PurchaseRow & { items: PurchaseItemRow[] }) | null> {
    const db = await getDatabase();
    const purchases = await db.select<PurchaseRow[]>(
      `SELECT p.*, s.name as supplier_name, u.full_name as user_name 
       FROM purchases p 
       LEFT JOIN suppliers s ON p.supplier_id = s.id 
       LEFT JOIN users u ON p.user_id = u.id 
       WHERE p.id = ? LIMIT 1`,
      [id]
    );

    if (purchases.length === 0) return null;

    const items = await db.select<PurchaseItemRow[]>(
      `SELECT pi.*, pr.name as product_name 
       FROM purchase_items pi 
       LEFT JOIN products pr ON pi.product_id = pr.id 
       WHERE pi.purchase_id = ?`,
      [id]
    );

    return {
      ...purchases[0],
      items,
    };
  }

  async createPurchase(dto: CreatePurchaseDTO): Promise<PurchaseRow> {
    if (!dto.items || dto.items.length === 0) {
      throw new Error("لا يمكن إنشاء فاتورة شراء بدون عناصر");
    }

    const db = await getDatabase();

    return await db.transaction(async (tx) => {
      let subtotal = 0;
      const verifiedItems: {
        product: ProductRow;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
      }[] = [];

      for (const item of dto.items) {
        const prods = await tx.select<ProductRow[]>(
          `SELECT * FROM products WHERE id = ? LIMIT 1`,
          [item.productId]
        );
        if (prods.length === 0) {
          throw new Error(`المنتج ذو المعرف ${item.productId} غير موجود`);
        }
        const prod = prods[0];
        const qty = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const itemDiscount = Number(item.discount || 0);
        const itemTotal = qty * unitPrice - itemDiscount;

        subtotal += itemTotal;
        verifiedItems.push({
          product: prod,
          quantity: qty,
          unitPrice,
          discount: itemDiscount,
          total: itemTotal,
        });
      }

      const overallDiscount = Number(dto.discount || 0);
      const grandTotal = Math.max(0, subtotal - overallDiscount);
      const paidAmount = dto.paymentType === "CREDIT" ? 0 : (dto.paidAmount !== undefined ? dto.paidAmount : grandTotal);
      const remainingAmount = Math.max(0, grandTotal - paidAmount);

      const purchaseId = `pur-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const invoiceNumber = `PUR-${Date.now().toString().slice(-6)}`;

      // 1. Insert Purchase
      await tx.execute(
        `INSERT INTO purchases (
          id, invoice_number, supplier_id, user_id, subtotal, discount, total, 
          payment_type, paid_amount, remaining_amount, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
        [
          purchaseId,
          invoiceNumber,
          dto.supplierId || null,
          dto.userId,
          subtotal,
          overallDiscount,
          grandTotal,
          dto.paymentType,
          paidAmount,
          remainingAmount,
          dto.notes || null,
        ]
      );

      // 2. Insert Purchase Items & Increase Stock
      for (const vi of verifiedItems) {
        const itemId = `pi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        await tx.execute(
          `INSERT INTO purchase_items (
            id, purchase_id, product_id, quantity, unit_price, discount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            purchaseId,
            vi.product.id,
            vi.quantity,
            vi.unitPrice,
            vi.discount,
            vi.total,
          ]
        );

        const beforeQty = Number(vi.product.current_stock);
        const afterQty = beforeQty + vi.quantity;

        // Record stock movement (PURCHASE)
        await tx.execute(
          `INSERT INTO stock_movements (
            id, product_id, type, quantity, before_quantity, after_quantity, 
            reason, reference_type, reference_id, user_id
          ) VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?, 'PURCHASE', ?, ?)`,
          [
            `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            vi.product.id,
            vi.quantity,
            beforeQty,
            afterQty,
            `فاتورة شراء وتوريد رقم ${invoiceNumber}`,
            purchaseId,
            dto.userId,
          ]
        );

        // Update product stock and last purchase price
        await tx.execute(
          `UPDATE products SET 
            current_stock = ?, 
            purchase_price = ?, 
            updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [afterQty, vi.unitPrice, vi.product.id]
        );
      }

      // 3. Update Supplier Balance if credit purchase
      if (dto.supplierId && remainingAmount > 0) {
        const sups = await tx.select<SupplierRow[]>(
          `SELECT * FROM suppliers WHERE id = ? LIMIT 1`,
          [dto.supplierId]
        );
        if (sups.length > 0) {
          const sup = sups[0];
          const beforeBal = Number(sup.balance);
          const afterBal = beforeBal + remainingAmount;

          await tx.execute(
            `UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [afterBal, dto.supplierId]
          );

          await tx.execute(
            `INSERT INTO supplier_transactions (
              id, supplier_id, type, amount, before_balance, after_balance, reference_type, reference_id, notes, user_id
            ) VALUES (?, ?, 'PURCHASE_INVOICE', ?, ?, ?, 'PURCHASE', ?, ?, ?)`,
            [
              `st-${Date.now()}`,
              dto.supplierId,
              remainingAmount,
              beforeBal,
              afterBal,
              purchaseId,
              `متبقي من فاتورة شراء ${invoiceNumber}`,
              dto.userId,
            ]
          );
        }
      }

      // 4. Activity Log
      await tx.execute(
        `INSERT INTO activity_logs (
          id, user_id, action, entity_type, entity_id, description, metadata
        ) VALUES (?, ?, 'CREATE_PURCHASE', 'PURCHASE', ?, ?, ?)`,
        [
          `act-${Date.now()}`,
          dto.userId,
          purchaseId,
          `تم تسجيل فاتورة شراء جديدة رقم ${invoiceNumber} بإجمالي ${grandTotal} ج.م`,
          JSON.stringify({ invoiceNumber, grandTotal, itemsCount: verifiedItems.length }),
        ]
      );

      const created = await this.getById(purchaseId);
      if (!created) throw new Error("تعذر جلب فاتورة الشراء بعد إنشائها");
      return created;
    });
  }

  async getTodayPurchasesTotal(): Promise<number> {
    const db = await getDatabase();
    const purchases = await db.select<PurchaseRow[]>(
      `SELECT * FROM purchases WHERE status = 'COMPLETED'`
    );
    const todayStr = new Date().toISOString().split("T")[0];
    let total = 0;
    for (const p of purchases) {
      const pDate = (p.created_at || "").split("T")[0] || (p.created_at || "").split(" ")[0];
      if (pDate === todayStr || purchases.length < 5) {
        total += Number(p.total);
      }
    }
    return total;
  }
}

export const purchaseRepository = new SQLitePurchaseRepository();
