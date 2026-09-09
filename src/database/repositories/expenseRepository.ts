// ==========================================================
// src/database/repositories/expenseRepository.ts
// مستودع بيانات المصروفات وتصنيفاتها
// ==========================================================

import { getDatabase } from "../connection";
import { ExpenseRow, ExpenseCategoryRow } from "@/types/database";

export interface CreateExpenseDTO {
  categoryId: string;
  amount: number;
  date: string;
  description?: string | null;
  userId: string;
}

export interface IExpenseRepository {
  getAll(limit?: number): Promise<ExpenseRow[]>;
  getCategories(): Promise<ExpenseCategoryRow[]>;
  createExpense(dto: CreateExpenseDTO): Promise<ExpenseRow>;
  deleteExpense(id: string): Promise<void>;
  getTotalExpenses(startDate?: string, endDate?: string): Promise<number>;
}

export class SQLiteExpenseRepository implements IExpenseRepository {
  async getAll(limit: number = 100): Promise<ExpenseRow[]> {
    const db = await getDatabase();
    return await db.select<ExpenseRow[]>(
      `SELECT e.*, c.name as category_name, u.full_name as user_name 
       FROM expenses e 
       LEFT JOIN expense_categories c ON e.category_id = c.id 
       LEFT JOIN users u ON e.user_id = u.id 
       ORDER BY e.date DESC, e.created_at DESC LIMIT ${limit}`
    );
  }

  async getCategories(): Promise<ExpenseCategoryRow[]> {
    const db = await getDatabase();
    return await db.select<ExpenseCategoryRow[]>(
      `SELECT * FROM expense_categories ORDER BY name ASC`
    );
  }

  async createExpense(dto: CreateExpenseDTO): Promise<ExpenseRow> {
    if (dto.amount <= 0) throw new Error("قيمة المصروف يجب أن تكون أكبر من الصفر");
    const db = await getDatabase();
    const id = `exp-${Date.now()}`;

    await db.execute(
      `INSERT INTO expenses (id, category_id, amount, date, description, user_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, dto.categoryId, dto.amount, dto.date, dto.description || null, dto.userId]
    );

    // Activity Log
    await db.execute(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, description) 
       VALUES (?, ?, 'CREATE_EXPENSE', 'EXPENSE', ?, ?)`,
      [`act-${Date.now()}`, dto.userId, id, `تم تسجيل مصروف بقيمة ${dto.amount} ج.م`]
    );

    const rows = await db.select<ExpenseRow[]>(
      `SELECT e.*, c.name as category_name, u.full_name as user_name 
       FROM expenses e 
       LEFT JOIN expense_categories c ON e.category_id = c.id 
       LEFT JOIN users u ON e.user_id = u.id 
       WHERE e.id = ? LIMIT 1`,
      [id]
    );
    return rows[0];
  }

  async deleteExpense(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM expenses WHERE id = ?`, [id]);
  }

  async getTotalExpenses(startDate?: string, endDate?: string): Promise<number> {
    const db = await getDatabase();
    let query = `SELECT SUM(amount) as total FROM expenses`;
    const params: any[] = [];

    if (startDate && endDate) {
      query += ` WHERE date >= ? AND date <= ?`;
      params.push(startDate, endDate);
    }

    const rows = await db.select<{ total: number }[]>(query, params);
    return rows.length > 0 && rows[0].total ? Number(rows[0].total) : 0;
  }
}

export const expenseRepository = new SQLiteExpenseRepository();
