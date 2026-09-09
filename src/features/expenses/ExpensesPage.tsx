// ==========================================================
// src/features/expenses/ExpensesPage.tsx
// موديول تسجيل المصروفات اليومية والإدارية
// ==========================================================

import * as React from "react";
import { Receipt, Plus, Trash2, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { expenseRepository } from "@/database/repositories/expenseRepository";
import { ExpenseRow, ExpenseCategoryRow } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ExpensesPage() {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = React.useState<ExpenseRow[]>([]);
  const [categories, setCategories] = React.useState<ExpenseCategoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Dialog State
  const [formOpen, setFormOpen] = React.useState(false);
  const [categoryId, setCategoryId] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [date, setDate] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = React.useState<ExpenseRow | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await expenseRepository.getAll();
      const cats = await expenseRepository.getCategories();
      setExpenses(list);
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    } catch (err) {
      console.error("فشل تحميل المصروفات:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const openCreateDialog = () => {
    setCategoryId(categories.length > 0 ? categories[0].id : "");
    setAmount(0);
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setFormError(null);
    setFormOpen(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (amount <= 0) {
      setFormError("قيمة المصروف يجب أن تكون أكبر من الصفر");
      return;
    }
    if (!categoryId) {
      setFormError("يرجى اختيار تصنيف المصروف");
      return;
    }

    setSubmitting(true);
    try {
      await expenseRepository.createExpense({
        categoryId,
        amount,
        date,
        description: description.trim() || null,
        userId: user?.id || "user-admin",
      });

      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "فشل تسجيل المصروف");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await expenseRepository.deleteExpense(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "تعذر حذف المصروف");
    }
  };

  const totalAmount = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المصروفات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تسجيل ومتابعة المصاريف اليومية وتأثيرها المباشر على صافي أرباح المحل.
          </p>
        </div>

        <Button onClick={openCreateDialog} size="sm" className="gap-1.5 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>تسجيل مصروف جديد</span>
        </Button>
      </div>

      {/* Summary KPI */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            إجمالي المصروفات المسجلة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono text-danger">
            {formatCurrency(totalAmount)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">تخصم آلياً عند حساب صافي الأرباح في التقارير</p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل المصروفات...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Receipt}
                title="لسه مفيش مصروفات مسجلة"
                description="سجل إيجار المحل أو فواتير الكهرباء أو المرتبات لاحتساب صافي الربح بدقة."
                actionText="+ تسجيل مصروف جديد"
                onAction={openCreateDialog}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>بند المصروف</TableHead>
                  <TableHead className="text-center font-bold">المبلغ</TableHead>
                  <TableHead>تاريخ الصرف</TableHead>
                  <TableHead>البيان / الوصف</TableHead>
                  <TableHead>المسؤول</TableHead>
                  <TableHead className="w-16 text-center">حذف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e, idx) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {e.category_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-sm text-foreground">
                      {formatCurrency(e.amount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(e.date)}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {e.description || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.user_name || "المسؤول"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-danger hover:bg-danger/10"
                        onClick={() => setDeleteTarget(e)}
                        title="حذف المصروف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE EXPENSE DIALOG */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل مصروف جديد</DialogTitle>
            <DialogDescription>أدخل تفاصيل المصروف والمبلغ وتاريخ الصرف.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExpense} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                {formError}
              </div>
            )}

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">بند المصروف *</label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">المبلغ (ج.م) *</label>
              <Input
                type="number"
                min="0.5"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="font-mono text-base font-bold"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">التاريخ</label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">البيان / ملاحظات</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تفاصيل إضافية عن الفاتورة أو سبب الصرف"
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "تسجيل المصروف"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف المصروف"
        description={`إنت متأكد إنك عايز تحذف مصروف بقيمة ${formatCurrency(deleteTarget?.amount || 0)}؟`}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        onConfirm={handleDeleteConfirm}
        variant="danger"
      />
    </div>
  );
}
