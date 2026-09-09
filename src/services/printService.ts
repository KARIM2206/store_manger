// ==========================================================
// src/services/printService.ts
// خدمة الطباعة للفواتير والتقارير وإيصالات البيع
// ==========================================================

import { SaleRow, SaleItemRow } from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export class PrintService {
  printSaleReceipt(sale: SaleRow, items: SaleItemRow[], storeName: string, phone: string): void {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="text-align: right; padding: 4px 0;">${item.product_name}</td>
          <td style="text-align: center; padding: 4px 0;">${item.quantity} ${item.unit_symbol || ""}</td>
          <td style="text-align: center; padding: 4px 0;">${formatCurrency(item.unit_price)}</td>
          <td style="text-align: left; padding: 4px 0;">${formatCurrency(item.total)}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>فاتورة بيع ${sale.invoice_number}</title>
          <style>
            body {
              font-family: 'Cairo', Arial, sans-serif;
              font-size: 12px;
              color: #000;
              margin: 10px;
              padding: 0;
              direction: rtl;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .store-name {
              font-size: 16px;
              font-weight: bold;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 11px;
            }
            th {
              border-bottom: 1px solid #000;
              padding: 4px 0;
            }
            .totals {
              border-top: 1px dashed #000;
              padding-top: 6px;
              margin-top: 6px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: bold;
              margin: 4px 0;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              font-size: 10px;
              border-top: 1px solid #ddd;
              padding-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${storeName}</div>
            <div>هاتف: ${phone}</div>
            <div>فاتورة بيع رقم: ${sale.invoice_number}</div>
            <div>التاريخ: ${formatDateTime(sale.created_at)}</div>
            ${sale.customer_name ? `<div>العميل: ${sale.customer_name}</div>` : ""}
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: right;">الصنف</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: center;">السعر</th>
                <th style="text-align: left;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="info-row">
              <span>المجموع الفرعي:</span>
              <span>${formatCurrency(sale.subtotal)}</span>
            </div>
            ${
              sale.discount > 0
                ? `<div class="info-row">
                    <span>الخصم:</span>
                    <span>${formatCurrency(sale.discount)}</span>
                  </div>`
                : ""
            }
            <div class="total-row">
              <span>الإجمالي النهائي:</span>
              <span>${formatCurrency(sale.total)}</span>
            </div>
            <div class="info-row">
              <span>المدفوع:</span>
              <span>${formatCurrency(sale.paid_amount)}</span>
            </div>
            ${
              sale.remaining_amount > 0
                ? `<div class="info-row" style="color: red; font-weight: bold;">
                    <span>المتبقي (آجل):</span>
                    <span>${formatCurrency(sale.remaining_amount)}</span>
                  </div>`
                : ""
            }
          </div>

          <div class="footer">
            <p>شكراً لتعاملكم معنا 🙏</p>
            <p>البضاعة المباعة ترد وتستبدل طبقاً للشروط</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export const printService = new PrintService();
