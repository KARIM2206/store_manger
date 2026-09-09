// ==========================================================
// src/features/purchases/PurchasesPage.tsx
// موديول فواتير المشتريات والتوريد وزيادة المخزون
// ==========================================================

import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShoppingBag,
  Plus,
  Trash2,
  AlertCircle,
  Truck,
  FileText,
  Calendar,
} from "lucide-react";
import { purchaseRepository, CreatePurchaseDTO } from "@/database/repositories/purchaseRepository";
import { productRepository } from "@/database/repositories/productRepository";
import { supplierRepository } from "@/database/repositories/supplierRepository";
import { ProductRow, SupplierRow, PurchaseRow } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { useFeature } from "@/stores/featureStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface PurchaseItemDraft {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export function PurchasesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const hasSuppliers = useFeature("suppliers");

  const [purchases, setPurchases] = React.useState<PurchaseRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // New Purchase Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>("");
  const [paymentType, setPaymentType] = React.useState<"CASH" | "CREDIT" | "PARTIAL">("CASH");
  const [paidAmount, setPaidAmount] = React.useState<number>(0);
  const [overallDiscount, setOverallDiscount] = React.useState<number>(0);
  const [notes, setNotes] = React.useState("");
  const [items, setItems] = React.useState<PurchaseItemDraft[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await purchaseRepository.getAll();
      const prods = await productRepository.getAll();
      setPurchases(list);
      setProducts(prods);

      if (hasSuppliers) {
        const sups = await supplierRepository.getAll();
        setSuppliers(sups);
      }
    } catch (err) {
      console.error("فشل تحميل فواتير المشتريات:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [hasSuppliers]);

  // Handle URL ?action=add
  React.useEffect(() => {
    if (searchParams.get("action") === "add") {
      openNewPurchaseDialog();
      setSearchParams({});
    }
  }, [searchParams]);

  const openNewPurchaseDialog = () => {
    setSelectedSupplierId(suppliers.length > 0 ? suppliers[0].id : "");
    setPaymentType("CASH");
    setPaidAmount(0);
    setOverallDiscount(0);
    setNotes("");
    setFormError(null);

    // Initial empty item if products available
    if (products.length > 0) {
      setItems([
        {
          productId: products[0].id,
          quantity: 10,
          unitPrice: products[0].purchase_price,
          discount: 0,
        },
      ]);
    } else {
      setItems([]);
    }

    setDialogOpen(true);
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    setItems([
      ...items,
      {
        productId: products[0].id,
        quantity: 1,
        unitPrice: products[0].purchase_price,
        discount: 0,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: keyof PurchaseItemDraft, value: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };

    // If changing product, auto set default unitPrice to that product's current purchase_price
    if (field === "productId") {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        updated[idx].unitPrice = prod.purchase_price;
      }
    }

    setItems(updated);
  };

  const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice - i.discount, 0);
  const grandTotal = Math.max(0, subtotal - overallDiscount);

  React.useEffect(() => {
    if (paymentType === "CASH") {
      setPaidAmount(grandTotal);
    } else if (paymentType === "CREDIT") {
      setPaidAmount(0);
    }
  }, [paymentType, grandTotal]);

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (items.length === 0) {
      setFormError("يرجى إضافة صنف واحد على الأقل لفاتورة الشراء");
      return;
    }

    for (const it of items) {
      if (it.quantity <= 0 || it.unitPrice < 0) {
        setFormError("الكميات والأسعار يجب أن تكون صحيحة");
        return;
      }
    }

    if (paymentType === "CREDIT" && !selectedSupplierId) {
      setFormError("يجب تحديد المورد عند الشراء بالآجل");
      return;
    }

    setSubmitting(true);
    try {
      await purchaseRepository.createPurchase({
        supplierId: selectedSupplierId || null,
        userId: user?.id || "user-admin",
        items,
        discount: overallDiscount,
        paymentType,
        paidAmount,
        notes: notes.trim() || null,
      });

      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "حدث خطأ أثناء حفظ فاتورة الشراء");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المشتريات والتوريد</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تسجيل فواتير الشراء الواردة وزيادة أرصدة المخزون تلقائياً.
          </p>
        </div>

        <Button onClick={openNewPurchaseDialog} size="sm" className="gap-1.5 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>فاتورة شراء جديدة</span>
        </Button>
      </div>

      {/* Purchases List */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل فواتير الشراء...</div>
          ) : purchases.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ShoppingBag}
                title="لسه مفيش فواتير شراء مسجلة"
                description="سجل أول فاتورة توريد لإضافة كميات جديدة للمخزن وتحديث أسعار التكلفة."
                actionText="+ فاتورة شراء جديدة"
                onAction={openNewPurchaseDialog}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead className="text-center font-bold">الإجمالي</TableHead>
                  <TableHead className="text-center">المدفوع</TableHead>
                  <TableHead className="text-center">المتبقي</TableHead>
                  <TableHead>المسؤول</TableHead>
                  <TableHead>تاريخ الفاتورة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold text-primary text-xs">
                      {p.invoice_number}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.supplier_name || "مورد نقدي عام"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.payment_type === "CASH" ? "success" : p.payment_type === "CREDIT" ? "warning" : "info"}
                        className="text-[10px]"
                      >
                        {p.payment_type === "CASH" ? "نقدي" : p.payment_type === "CREDIT" ? "آجل" : "جزئي"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold font-mono text-sm">
                      {formatCurrency(p.total)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {formatCurrency(p.paid_amount)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-semibold text-danger">
                      {p.remaining_amount > 0 ? formatCurrency(p.remaining_amount) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.user_name || "المسؤول"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDateTime(p.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* NEW PURCHASE DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تسجيل فاتورة شراء وتوريد جديدة</DialogTitle>
            <DialogDescription>
              تأكيد الفاتورة سيزيد رصيد الأصناف في المخزن تلقائياً ويثبت التكلفة في الدفتر.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPurchase} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Supplier & Payment Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasSuppliers && (
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-foreground">المورد</label>
                  <Select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                  >
                    <option value="">مورد عام (بدون اسم)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.balance > 0 ? `(مستحق له: ${s.balance} ج.م)` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">طريقة السداد</label>
                <Select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                >
                  <option value="CASH">دفع نقدي (كاش)</option>
                  {hasSuppliers && <option value="CREDIT">شراء آجل (على الحساب)</option>}
                  {hasSuppliers && <option value="PARTIAL">دفع جزئي (مقدم + آجل)</option>}
                </Select>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2 text-right">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-foreground">أصناف الفاتورة *</label>
                <Button type="button" variant="outline" size="sm" onClick={addItemRow} className="h-7 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  <span>إضافة صنف</span>
                </Button>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-2 text-right">المنتج</th>
                      <th className="p-2 text-center w-24">الكمية</th>
                      <th className="p-2 text-center w-28">سعر الشراء</th>
                      <th className="p-2 text-left w-24">الإجمالي</th>
                      <th className="p-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-1.5">
                          <Select
                            value={row.productId}
                            onChange={(e) => updateItemRow(idx, "productId", e.target.value)}
                            className="h-8 text-xs"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (المتاح: {p.current_stock})
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            min="0.1"
                            step="any"
                            value={row.quantity}
                            onChange={(e) => updateItemRow(idx, "quantity", Number(e.target.value))}
                            className="h-8 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={row.unitPrice}
                            onChange={(e) => updateItemRow(idx, "unitPrice", Number(e.target.value))}
                            className="h-8 text-xs text-center font-mono"
                          />
                        </td>
                        <td className="p-1.5 text-left font-mono font-bold">
                          {formatCurrency(row.quantity * row.unitPrice - row.discount)}
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1 text-muted-foreground hover:text-danger"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">خصم إجمالي (ج.م)</label>
                <Input
                  type="number"
                  min="0"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {paymentType === "PARTIAL" && (
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-foreground">المدفوع نقداً</label>
                  <Input
                    type="number"
                    min="0"
                    max={grandTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 text-right divide-y divide-border/50">
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">المجموع:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between pt-1.5 text-sm font-bold text-foreground">
                <span>الإجمالي النهائي للفاتورة:</span>
                <span className="font-mono text-primary text-base">{formatCurrency(grandTotal)}</span>
              </div>
              {paymentType !== "CASH" && (
                <div className="flex justify-between pt-1 text-danger font-semibold">
                  <span>المتبقي في رصيد المورد:</span>
                  <span className="font-mono">{formatCurrency(grandTotal - paidAmount)}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "تأكيد واستلام البضاعة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
