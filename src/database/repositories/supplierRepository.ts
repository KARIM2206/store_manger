// ==========================================================
// src/database/repositories/supplierRepository.ts
// مستودع بيانات الموردين وأرصدتهم وسجل التوريدات
// ==========================================================

import { getDatabase } from "../connection";
import { SupplierRow, SupplierTransactionRow, PurchaseRow } from "@/types/database";

export interface SupplierDetailsDTO extends SupplierRow {
  total_purchases: number;
  total_paid: number;
  total_remaining: number;
  purchases: PurchaseRow[];
  transactions: SupplierTransactionRow[];
}

export interface ISupplierRepository {
  getAll(): Promise<SupplierRow[]>;
  getById(id: string): Promise<SupplierDetailsDTO | null>;
  create(data: Omit<SupplierRow, "id" | "created_at" | "updated_at" | "balance">): Promise<SupplierRow>;
  update(id: string, data: Partial<SupplierRow>): Promise<SupplierRow>;
  delete(id: string): Promise<void>;
  recordPayment(supplierId: string, amount: number, notes: string, userId: string): Promise<void>;
}

export class SQLiteSupplierRepository implements ISupplierRepository {
  async getAll(): Promise<SupplierRow[]> {
    const db = await getDatabase();
    return await db.select<SupplierRow[]>(
      `SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC`
    );
  }

  async getById(id: string): Promise<SupplierDetailsDTO | null> {
    const db = await getDatabase();
    const rows = await db.select<SupplierRow[]>(
      `SELECT * FROM suppliers WHERE id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return null;

    const supplier = rows[0];
    const purchases = await db.select<PurchaseRow[]>(
      `SELECT * FROM purchases WHERE supplier_id = ? ORDER BY created_at DESC`,
      [id]
    );

    const transactions = await db.select<SupplierTransactionRow[]>(
      `SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY created_at DESC`,
      [id]
    );

    let total_purchases = 0;
    let total_paid = 0;
    let total_remaining = 0;

    for (const p of purchases) {
      total_purchases += Number(p.total);
      total_paid += Number(p.paid_amount);
      total_remaining += Number(p.remaining_amount);
    }

    return {
      ...supplier,
      total_purchases,
      total_paid,
      total_remaining,
      purchases,
      transactions,
    };
  }

  async create(data: Omit<SupplierRow, "id" | "created_at" | "updated_at" | "balance">): Promise<SupplierRow> {
    const db = await getDatabase();
    const id = `sup-${Date.now()}`;
    await db.execute(
      `INSERT INTO suppliers (id, name, phone, second_phone, address, email, balance, notes, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, 0.0, ?, 1)`,
      [
        id,
        data.name,
        data.phone,
        data.second_phone || null,
        data.address || null,
        data.email || null,
        data.notes || null,
      ]
    );

    const created = await this.getById(id);
    if (!created) throw new Error("تعذر جلب المورد بعد إنشائه");
    return created;
  }

  async update(id: string, data: Partial<SupplierRow>): Promise<SupplierRow> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error("المورد غير موجود للتعديل");

    await db.execute(
      `UPDATE suppliers SET 
        name = ?, phone = ?, second_phone = ?, address = ?, email = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        data.name ?? existing.name,
        data.phone !== undefined ? data.phone : existing.phone,
        data.second_phone !== undefined ? data.second_phone : existing.second_phone,
        data.address !== undefined ? data.address : existing.address,
        data.email !== undefined ? data.email : existing.email,
        data.notes !== undefined ? data.notes : existing.notes,
        id,
      ]
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error("تعذر جلب بيانات المورد بعد التعديل");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const supplier = await this.getById(id);
    if (supplier && supplier.balance > 0) {
      throw new Error(`لا يمكن حذف المورد لأن له مستحقات متبقية بقيمة ${supplier.balance} ج.م`);
    }
    const db = await getDatabase();
    await db.execute(
      `UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  async recordPayment(supplierId: string, amount: number, notes: string, userId: string): Promise<void> {
    if (amount <= 0) throw new Error("المبلغ المسدد يجب أن يكون أكبر من الصفر");
    const db = await getDatabase();

    await db.transaction(async (tx) => {
      const suppliers = await tx.select<SupplierRow[]>(
        `SELECT * FROM suppliers WHERE id = ? LIMIT 1`,
        [supplierId]
      );
      if (suppliers.length === 0) throw new Error("المورد غير موجود");

      const sup = suppliers[0];
      const beforeBal = Number(sup.balance);
      const afterBal = Math.max(0, beforeBal - amount);

      await tx.execute(
        `UPDATE suppliers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [afterBal, supplierId]
      );

      await tx.execute(
        `INSERT INTO supplier_transactions (
          id, supplier_id, type, amount, before_balance, after_balance, reference_type, notes, user_id
        ) VALUES (?, ?, 'PAYMENT', ?, ?, ?, 'MANUAL_PAYMENT', ?, ?)`,
        [`st-${Date.now()}`, supplierId, amount, beforeBal, afterBal, notes, userId]
      );

      await tx.execute(
        `INSERT INTO activity_logs (
          id, user_id, action, entity_type, entity_id, description
        ) VALUES (?, ?, 'SUPPLIER_PAYMENT', 'SUPPLIER', ?, ?)`,
        [
          `act-${Date.now()}`,
          userId,
          supplierId,
          `تم تسجيل سند صرف وسداد بقيمة ${amount} ج.م للمورد ${sup.name}`,
        ]
      );
    });
  }
}

export const supplierRepository = new SQLiteSupplierRepository();
