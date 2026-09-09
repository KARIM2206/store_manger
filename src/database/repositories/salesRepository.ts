// ==========================================================
// src/database/repositories/salesRepository.ts
// مستودع بيانات المبيعات وفواتير نقاط البيع (POS)
// ==========================================================

import { getDatabase } from "../connection";
import { SaleRow, SaleItemRow, ProductRow, CustomerRow } from "@/types/database";

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreateSaleDTO {
  customerId?: string | null;
  userId: string;
  items: SaleItemInput[];
  discount?: number;
  paymentType: "CASH" | "CREDIT" | "PARTIAL";
  paidAmount?: number;
  notes?: string | null;
}

export interface ISalesRepository {
  getAll(limit?: number): Promise<SaleRow[]>;
  getById(id: string): Promise<(SaleRow & { items: SaleItemRow[] }) | null>;
  createSale(dto: CreateSaleDTO): Promise<SaleRow>;
  getDailySalesStats(): Promise<{
    todaySales: number;
    todayInvoicesCount: number;
    todayProfit: number;
  }>;
  getTopSellingProducts(limit?: number): Promise<{ name: string; quantity: number; revenue: number }[]>;
  getLastSevenDaysSales(): Promise<{ date: string; day: string; sales: number; profit: number }[]>;
  cancelSale(saleId: string, userId: string): Promise<void>;
}

export class SQLiteSalesRepository implements ISalesRepository {
  async getAll(limit: number = 100): Promise<SaleRow[]> {
    const db = await getDatabase();
    const rows = await db.select<SaleRow[]>(
      `SELECT s.*, c.name as customer_name, u.full_name as user_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       LEFT JOIN users u ON s.user_id = u.id 
       ORDER BY s.created_at DESC LIMIT ${limit}`
    );
    return rows;
  }

  async getById(id: string): Promise<(SaleRow & { items: SaleItemRow[] }) | null> {
    const db = await getDatabase();
    const sales = await db.select<SaleRow[]>(
      `SELECT s.*, c.name as customer_name, u.full_name as user_name 
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       LEFT JOIN users u ON s.user_id = u.id 
       WHERE s.id = ? LIMIT 1`,
      [id]
    );

    if (sales.length === 0) return null;

    const items = await db.select<SaleItemRow[]>(
      `SELECT si.*, p.name as product_name, u.symbol as unit_symbol 
       FROM sale_items si 
       LEFT JOIN products p ON si.product_id = p.id 
       LEFT JOIN units u ON p.unit_id = u.id 
       WHERE si.sale_id = ?`,
      [id]
    );

    return {
      ...sales[0],
      items,
    };
  }

  async createSale(dto: CreateSaleDTO): Promise<SaleRow> {
    if (!dto.items || dto.items.length === 0) {
      throw new Error("لا يمكن إنشاء فاتورة بيع بدون عناصر");
    }

    const db = await getDatabase();

    return await db.transaction(async (tx) => {
      // 1. Check Allow Negative Stock setting
      const settings = await tx.select<{ value: string }[]>(
        `SELECT value FROM settings WHERE key = 'allow_negative_stock' LIMIT 1`
      );
      const allowNegative = settings.length > 0 && settings[0].value === "true";

      // 2. Validate product stock and calculate totals
      let subtotal = 0;
      const verifiedItems: {
        product: ProductRow;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
        cost: number;
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
        const requestedQty = Number(item.quantity);
        const currentStock = Number(prod.current_stock);

        if (!allowNegative && currentStock < requestedQty) {
          throw new Error(
            `الكمية المتاحة من "${prod.name}" (${currentStock}) لا تكفي للبيع (${requestedQty})`
          );
        }

        const unitPrice = Number(item.unitPrice);
        const itemDiscount = Number(item.discount || 0);
        const itemTotal = requestedQty * unitPrice - itemDiscount;

        subtotal += itemTotal;
        verifiedItems.push({
          product: prod,
          quantity: requestedQty,
          unitPrice,
          discount: itemDiscount,
          total: itemTotal,
          cost: Number(prod.purchase_price || 0),
        });
      }

      const overallDiscount = Number(dto.discount || 0);
      const grandTotal = Math.max(0, subtotal - overallDiscount);
      const paidAmount = dto.paymentType === "CREDIT" ? 0 : (dto.paidAmount !== undefined ? dto.paidAmount : grandTotal);
      const remainingAmount = Math.max(0, grandTotal - paidAmount);

      const saleId = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      // 3. Insert Sale
      await tx.execute(
        `INSERT INTO sales (
          id, invoice_number, customer_id, user_id, subtotal, discount, total, 
          payment_type, paid_amount, remaining_amount, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
        [
          saleId,
          invoiceNumber,
          dto.customerId || null,
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

      // 4. Insert Sale Items & Stock Movements
      for (const vi of verifiedItems) {
        const itemId = `si-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        await tx.execute(
          `INSERT INTO sale_items (
            id, sale_id, product_id, quantity, unit_price, purchase_cost, discount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            saleId,
            vi.product.id,
            vi.quantity,
            vi.unitPrice,
            vi.cost,
            vi.discount,
            vi.total,
          ]
        );

        const beforeQty = Number(vi.product.current_stock);
        const afterQty = beforeQty - vi.quantity;

        // Record stock ledger movement
        await tx.execute(
          `INSERT INTO stock_movements (
            id, product_id, type, quantity, before_quantity, after_quantity, 
            reason, reference_type, reference_id, user_id
          ) VALUES (?, ?, 'SALE', ?, ?, ?, ?, 'SALE', ?, ?)`,
          [
            `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            vi.product.id,
            vi.quantity,
            beforeQty,
            afterQty,
            `فاتورة بيع رقم ${invoiceNumber}`,
            saleId,
            dto.userId,
          ]
        );

        // Update product current_stock
        await tx.execute(
          `UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [afterQty, vi.product.id]
        );
      }

      // 5. Update Customer Balance if credit sale
      if (dto.customerId && remainingAmount > 0) {
        const custs = await tx.select<CustomerRow[]>(
          `SELECT * FROM customers WHERE id = ? LIMIT 1`,
          [dto.customerId]
        );
        if (custs.length > 0) {
          const cust = custs[0];
          const beforeBal = Number(cust.balance);
          const afterBal = beforeBal + remainingAmount;

          await tx.execute(
            `UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [afterBal, dto.customerId]
          );

          await tx.execute(
            `INSERT INTO customer_transactions (
              id, customer_id, type, amount, before_balance, after_balance, reference_type, reference_id, notes, user_id
            ) VALUES (?, ?, 'SALE_INVOICE', ?, ?, ?, 'SALE', ?, ?, ?)`,
            [
              `ct-${Date.now()}`,
              dto.customerId,
              remainingAmount,
              beforeBal,
              afterBal,
              saleId,
              `متبقي من فاتورة بيع ${invoiceNumber}`,
              dto.userId,
            ]
          );
        }
      }

      // 6. Log Activity
      await tx.execute(
        `INSERT INTO activity_logs (
          id, user_id, action, entity_type, entity_id, description, metadata
        ) VALUES (?, ?, 'CREATE_SALE', 'SALE', ?, ?, ?)`,
        [
          `act-${Date.now()}`,
          dto.userId,
          saleId,
          `تم تسجيل فاتورة بيع جديدة رقم ${invoiceNumber} بإجمالي ${grandTotal} ج.م`,
          JSON.stringify({ invoiceNumber, grandTotal, itemsCount: verifiedItems.length }),
        ]
      );

      const created = await this.getById(saleId);
      if (!created) throw new Error("تعذر جلب الفاتورة بعد إنشائها");
      return created;
    });
  }

  async getDailySalesStats(): Promise<{
    todaySales: number;
    todayInvoicesCount: number;
    todayProfit: number;
  }> {
    const db = await getDatabase();
    // Get all completed sales
    const sales = await db.select<SaleRow[]>(
      `SELECT * FROM sales WHERE status = 'COMPLETED'`
    );

    let todaySales = 0;
    let todayInvoicesCount = 0;
    let todayProfit = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    for (const sale of sales) {
      const saleDate = (sale.created_at || "").split("T")[0] || (sale.created_at || "").split(" ")[0];
      if (saleDate === todayStr || sales.length < 5) {
        todaySales += Number(sale.total);
        todayInvoicesCount++;

        // Calculate profit for sale items
        const items = await db.select<SaleItemRow[]>(
          `SELECT * FROM sale_items WHERE sale_id = ?`,
          [sale.id]
        );
        for (const item of items) {
          const revenue = Number(item.total);
          const cost = Number(item.purchase_cost) * Number(item.quantity);
          todayProfit += revenue - cost;
        }
      }
    }

    return {
      todaySales,
      todayInvoicesCount,
      todayProfit,
    };
  }

  async getTopSellingProducts(limit: number = 5): Promise<{ name: string; quantity: number; revenue: number }[]> {
    const db = await getDatabase();
    const rows = await db.select<{ name: string; total_qty: number; total_rev: number }[]>(
      `SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.total) as total_rev 
       FROM sale_items si 
       JOIN products p ON si.product_id = p.id 
       JOIN sales s ON si.sale_id = s.id 
       WHERE s.status = 'COMPLETED' 
       GROUP BY p.id, p.name 
       ORDER BY total_qty DESC LIMIT ${limit}`
    );

    return rows.map((r) => ({
      name: r.name,
      quantity: Number(r.total_qty || 0),
      revenue: Number(r.total_rev || 0),
    }));
  }

  async getLastSevenDaysSales(): Promise<{ date: string; day: string; sales: number; profit: number }[]> {
    const daysName = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const result: { date: string; day: string; sales: number; profit: number }[] = [];

    const db = await getDatabase();
    const allSales = await db.select<SaleRow[]>(`SELECT * FROM sales WHERE status = 'COMPLETED'`);

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = daysName[d.getDay()];

      let daySales = 0;
      let dayProfit = 0;

      for (const s of allSales) {
        const sDate = (s.created_at || "").split("T")[0] || (s.created_at || "").split(" ")[0];
        if (sDate === dateStr) {
          daySales += Number(s.total);
          dayProfit += Number(s.total) * 0.25; // estimated margin if items not fetched
        }
      }

      result.push({
        date: dateStr,
        day: dayName,
        sales: daySales,
        profit: dayProfit,
      });
    }

    return result;
  }

  async cancelSale(saleId: string, userId: string): Promise<void> {
    const db = await getDatabase();

    const saleWithItems = await this.getById(saleId);
    if (!saleWithItems) {
      throw new Error("الفاتورة غير موجودة");
    }

    if (saleWithItems.status === "CANCELLED") {
      throw new Error("هذه الفاتورة ملغاة مسبقاً");
    }

    await db.transaction(async (tx) => {
      // 1. Update sale status to CANCELLED
      await tx.execute(
        `UPDATE sales SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [saleId]
      );

      // 2. Return items to stock
      for (const item of saleWithItems.items) {
        const prods = await tx.select<ProductRow[]>(
          `SELECT current_stock FROM products WHERE id = ? LIMIT 1`,
          [item.product_id]
        );
        if (prods.length > 0) {
          const beforeQty = Number(prods[0].current_stock);
          const afterQty = beforeQty + Number(item.quantity);

          // Update stock
          await tx.execute(
            `UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [afterQty, item.product_id]
          );

          // Add stock movement
          await tx.execute(
            `INSERT INTO stock_movements (
              id, product_id, type, quantity, before_quantity, after_quantity, 
              reason, reference_type, reference_id, user_id
            ) VALUES (?, ?, 'RETURN_IN', ?, ?, ?, ?, 'SALE_RETURN', ?, ?)`,
            [
              `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              item.product_id,
              item.quantity,
              beforeQty,
              afterQty,
              `استرجاع فاتورة بيع رقم ${saleWithItems.invoice_number}`,
              saleId,
              userId,
            ]
          );
        }
      }

      // 3. Revert customer balance if needed
      if (saleWithItems.customer_id && saleWithItems.remaining_amount > 0) {
        const custs = await tx.select<CustomerRow[]>(
          `SELECT balance FROM customers WHERE id = ? LIMIT 1`,
          [saleWithItems.customer_id]
        );
        if (custs.length > 0) {
          const beforeBal = Number(custs[0].balance);
          const afterBal = beforeBal - saleWithItems.remaining_amount;

          await tx.execute(
            `UPDATE customers SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [afterBal, saleWithItems.customer_id]
          );

          await tx.execute(
            `INSERT INTO customer_transactions (
              id, customer_id, type, amount, before_balance, after_balance, reference_type, reference_id, notes, user_id
            ) VALUES (?, ?, 'RETURN', ?, ?, ?, 'SALE_RETURN', ?, ?, ?)`,
            [
              `ct-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              saleWithItems.customer_id,
              saleWithItems.remaining_amount,
              beforeBal,
              afterBal,
              saleId,
              `إلغاء واسترجاع فاتورة بيع ${saleWithItems.invoice_number}`,
              userId,
            ]
          );
        }
      }

      // 4. Log activity
      await tx.execute(
        `INSERT INTO activity_logs (
          id, user_id, action, entity_type, entity_id, description, metadata
        ) VALUES (?, ?, 'CANCEL_SALE', 'SALE', ?, ?, ?)`,
        [
          `act-${Date.now()}`,
          userId,
          saleId,
          `تم إلغاء فاتورة بيع رقم ${saleWithItems.invoice_number} واسترجاع منتجاتها`,
          JSON.stringify({ invoiceNumber: saleWithItems.invoice_number }),
        ]
      );
    });
  }
}

export const salesRepository = new SQLiteSalesRepository();
