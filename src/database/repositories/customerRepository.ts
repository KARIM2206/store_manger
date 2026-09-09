// ==========================================================
// src/database/repositories/customerRepository.ts
// مستودع بيانات العملاء والمديونيات وسجل المعاملات
// ==========================================================

import { getDatabase } from "../connection";
import { CustomerRow, CustomerTransactionRow, SaleRow } from "@/types/database";

export interface CustomerDetailsDTO extends CustomerRow {
  total_sales: number;
  total_paid: number;
  total_remaining: number;
  sales: SaleRow[];
  transactions: CustomerTransactionRow[];
}

export interface ICustomerRepository {
  getAll(): Promise<CustomerRow[]>;
  getById(id: string): Promise<CustomerDetailsDTO | null>;
  create(data: Omit<CustomerRow, "id" | "created_at" | "updated_at" | "balance">): Promise<CustomerRow>;
  update(id: string, data: Partial<CustomerRow>): Promise<CustomerRow>;
  delete(id: string): Promise<void>;
  recordPayment(customerId: string, amount: number, notes: string, userId: string): Promise<void>;
}

export class SQLiteCustomerRepository implements ICustomerRepository {
  async getAll(): Promise<CustomerRow[]> {
    const db = await getDatabase();
    return await db.select<CustomerRow[]>(
      `SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC`
    );
  }

  async getById(id: string): Promise<CustomerDetailsDTO | null> {
    const db = await getDatabase();
    const rows = await db.select<CustomerRow[]>(
      `SELECT * FROM customers WHERE id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return null;

    const customer = rows[0];
    const sales = await db.select<SaleRow[]>(
      `SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC`,
      [id]
    );

    const transactions = await db.select<CustomerTransactionRow[]>(
      `SELECT * FROM customer_transactions WHERE customer_id = ? ORDER BY created_at DESC`,
      [id]
    );

    let total_sales = 0;
    let total_paid = 0;
    let total_remaining = 0;

    for (const s of sales) {
      total_sales += Number(s.total);
      total_paid += Number(s.paid_amount);
      total_remaining += Number(s.remaining_amount);
    }

    return {
      ...customer,
      total_sales,
      total_paid,
      total_remaining,
      sales,
      transactions,
    };
  }

  async create(data: Omit<CustomerRow, "id" | "created_at" | "updated_at" | "balance">): Promise<CustomerRow> {
    const db = await getDatabase();
    const id = `cust-${Date.now()}`;
    await db.execute(
      `INSERT INTO customers (id, name, phone, address, balance, notes, is_active) 
       VALUES (?, ?, ?, ?, 0.0, ?, 1)`,
      [id, data.name, data.phone || null, data.address || null, data.notes || null]
    );

    const created = await this.getById(id);
    if (!created) throw new Error("تعذر جلب العميل بعد إنشائه");
    return created;
  }

  async update(id: string, data: Partial<CustomerRow>): Promise<CustomerRow> {
    const db = await getDatabase();
    const existing = await this.getById(id);
    if (!existing) throw new Error("العميل غير موجود للتعديل");

    await db.execute(
      `UPDATE customers SET 
        name = ?, phone = ?, address = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        data.name ?? existing.name,
        data.phone !== undefined ? data.phone : existing.phone,
        data.address !== undefined ? data.address : existing.address,
        data.notes !== undefined ? data.notes : existing.notes,
        id,
      ]
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error("تعذر جلب بيانات العميل بعد التعديل");
    return updated;
  }

  async delete(id: string): Promise<void> {
    const customer = await this.getById(id);
    if (customer && customer.balance > 0) {
      throw new Error(`لا يمكن حذف العميل لأن عليه مديونية متبقية بقيمة ${customer.balance} ج.م`);
    }
    const db = await getDatabase();
    await db.execute(
      `UPDATE customers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  async recordPayment(customerId: string, amount: number, notes: string, userId: string): Promise<void> {
    if (amount <= 0) throw new Error("المبلغ المدفوع يجب أن يكون أكبر من الصفر");
    const db = await getDatabase();

    await db.transaction(async (tx) => {
      const customers = await tx.select<CustomerRow[]>(
        `SELECT * FROM customers WHERE id = ? LIMIT 1`,
        [customerId]
      );
      if (customers.length === 0) throw new Error("العميل غير موجود");

      const cust = customers[0];
      const beforeBal = Number(cust.balance);
      const afterBal = Math.max(0, beforeBal - amount);

      await tx.execute(
        `UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [afterBal, customerId]
      );

      await tx.execute(
        `INSERT INTO customer_transactions (
          id, customer_id, type, amount, before_balance, after_balance, reference_type, notes, user_id
        ) VALUES (?, ?, 'PAYMENT', ?, ?, ?, 'MANUAL_PAYMENT', ?, ?)`,
        [`ct-${Date.now()}`, customerId, amount, beforeBal, afterBal, notes, userId]
      );

      await tx.execute(
        `INSERT INTO activity_logs (
          id, user_id, action, entity_type, entity_id, description
        ) VALUES (?, ?, 'CUSTOMER_PAYMENT', 'CUSTOMER', ?, ?)`,
        [
          `act-${Date.now()}`,
          userId,
          customerId,
          `تم تسجيل سند قبض وسداد بقيمة ${amount} ج.م للعميل ${cust.name}`,
        ]
      );
    });
  }
}

export const customerRepository = new SQLiteCustomerRepository();
