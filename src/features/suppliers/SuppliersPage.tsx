// ==========================================================
// src/features/suppliers/SuppliersPage.tsx
// موديول إدارة الموردين وأرصدتهم وسندات الصرف
// ==========================================================

import * as React from "react";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CreditCard,
  Phone,
  Search,
} from "lucide-react";
import { supplierRepository, SupplierDetailsDTO } from "@/database/repositories/supplierRepository";
import { SupplierRow } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function SuppliersPage() {
  const { user, hasPermission } = useAuthStore();
  const canCreate = hasPermission("suppliers.create");
  const canUpdate = hasPermission("suppliers.update");
  const canDelete = hasPermission("suppliers.delete");

  const [suppliers, setSuppliers] = React.useState<SupplierRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Create / Edit Modal
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<SupplierRow | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [secondPhone, setSecondPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Statement Sheet
  const [detailsSupplier, setDetailsSupplier] = React.useState<SupplierDetailsDTO | null>(null);

  // Payment Dialog (سند صرف)
  const [paymentSupplier, setPaymentSupplier] = React.useState<SupplierRow | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState<number>(0);
  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [paymentError, setPaymentError] = React.useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = React.useState<SupplierRow | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await supplierRepository.getAll();
      setSuppliers(list);
    } catch (err) {
      console.error("فشل تحميل الموردين:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const openCreateDialog = () => {
    setEditingSupplier(null);
    setName("");
    setPhone("");
    setSecondPhone("");
    setAddress("");
    setEmail("");
    setNotes("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (s: SupplierRow) => {
    setEditingSupplier(s);
    setName(s.name);
    setPhone(s.phone);
    setSecondPhone(s.second_phone || "");
    setAddress(s.address || "");
    setEmail(s.email || "");
    setNotes(s.notes || "");
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("اسم المورد مطلوب");
      return;
    }
    if (!phone.trim()) {
      setFormError("رقم الهاتف مطلوب");
      return;
    }

    setSubmitting(true);
    try {
      if (editingSupplier) {
        await supplierRepository.update(editingSupplier.id, {
          name: name.trim(),
          phone: phone.trim(),
          second_phone: secondPhone.trim() || null,
          address: address.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await supplierRepository.create({
          name: name.trim(),
          phone: phone.trim(),
          second_phone: secondPhone.trim() || null,
          address: address.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
          is_active: 1,
        });
      }

      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "حدث خطأ أثناء حفظ المورد");
    } finally {
      setSubmitting(false);
    }
  };

  const openStatement = async (s: SupplierRow) => {
    const details = await supplierRepository.getById(s.id);
    setDetailsSupplier(details);
  };

  const openPaymentDialog = (s: SupplierRow) => {
    setPaymentSupplier(s);
    setPaymentAmount(s.balance > 0 ? s.balance : 0);
    setPaymentNotes("سداد نقدي للمورد");
    setPaymentError(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSupplier) return;
    setPaymentError(null);

    if (paymentAmount <= 0) {
      setPaymentError("المبلغ المسدد يجب أن يكون أكبر من الصفر");
      return;
    }

    setSubmitting(true);
    try {
      await supplierRepository.recordPayment(
        paymentSupplier.id,
        paymentAmount,
        paymentNotes.trim(),
        user?.id || "user-admin"
      );
      setPaymentSupplier(null);
      await loadData();
      if (detailsSupplier?.id === paymentSupplier.id) {
        openStatement(paymentSupplier);
      }
    } catch (err: any) {
      setPaymentError(err?.message || "فشل تسجيل سند الصرف");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await supplierRepository.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "تعذر حذف المورد");
    }
  };

  const filtered = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الموردين</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة شركات ومصانع التوريد وحسابات الأرصدة وسندات الصرف.
          </p>
        </div>

        {canCreate && (
          <Button onClick={openCreateDialog} size="sm" className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>إضافة مورد جديد</span>
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث باسم المورد أو رقم الهاتف..."
          className="pr-9 h-9 text-xs"
        />
      </div>

      {/* Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل الموردين...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Truck}
                title="لسه مفيش موردين مسجلين"
                description="أضف أول مورد لربطه بفواتير الشراء ومتابعة المستحقات والأرصدة."
                actionText={canCreate ? "+ إضافة مورد جديد" : undefined}
                onAction={canCreate ? openCreateDialog : undefined}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>اسم المورد / الشركة</TableHead>
                  <TableHead>الهاتف الأساسي</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead className="text-center font-bold">الرصيد المستحق له</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead className="w-36 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, idx) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-sm">
                      {s.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {s.phone}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.address || "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-sm">
                      {s.balance > 0 ? (
                        <span className="text-warning font-semibold">{formatCurrency(s.balance)}</span>
                      ) : (
                        <span className="text-success text-xs">خالص المستحقات</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                      {s.notes || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => openStatement(s)}
                          title="كشف الحساب"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {s.balance > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:bg-success/10"
                            onClick={() => openPaymentDialog(s)}
                            title="سند صرف وسداد"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning hover:bg-warning/10"
                            onClick={() => openEditDialog(s)}
                            title="تعديل"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-danger hover:bg-danger/10"
                            onClick={() => setDeleteTarget(s)}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات التواصل والشركة للتوريدات.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSupplier} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                {formError}
              </div>
            )}

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">اسم المورد أو الشركة *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شركة النور للتوريدات"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">رقم الهاتف *</label>
                <Input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">هاتف إضافي</label>
                <Input
                  value={secondPhone}
                  onChange={(e) => setSecondPhone(e.target.value)}
                  placeholder="022xxxxxxxx"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">العنوان</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="المنطقة الصناعية، المدينة..."
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">البريد الإلكتروني</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@supplier.com"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">ملاحظات</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="وكيل معتمد، خصومات خاصة..."
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : editingSupplier ? "حفظ التعديل" : "إضافة المورد"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RECORD PAYMENT (سند صرف) DIALOG */}
      <Dialog open={!!paymentSupplier} onOpenChange={(open) => !open && setPaymentSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل سند صرف وسداد للمورد</DialogTitle>
            <DialogDescription>
              صرف دفعة نقدية للمورد <span className="font-bold text-foreground">{paymentSupplier?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            {paymentError && (
              <div className="rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                {paymentError}
              </div>
            )}

            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-right">
              <div className="flex justify-between">
                <span>إجمالي مستحقات المورد الحالية:</span>
                <span className="font-mono font-bold text-warning text-sm">
                  {formatCurrency(paymentSupplier?.balance || 0)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">المبلغ المصروف والمسدد (ج.م) *</label>
              <Input
                type="number"
                min="1"
                step="any"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="font-mono text-base font-bold"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">البيان / الملاحظات *</label>
              <Input
                required
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="سداد دفعة نقدية، تحويل بنكي..."
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentSupplier(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="success" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "تأكيد سند الصرف"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* STATEMENT OF ACCOUNT SHEET */}
      {detailsSupplier && (
        <Sheet open={!!detailsSupplier} onOpenChange={(open) => !open && setDetailsSupplier(null)}>
          <SheetHeader>
            <SheetTitle>كشف حساب المورد</SheetTitle>
            <SheetDescription>{detailsSupplier.name}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 my-4 text-xs text-right">
            {/* KPI Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block">إجمالي التوريدات</span>
                <span className="font-bold font-mono text-sm text-foreground">
                  {formatCurrency(detailsSupplier.total_purchases)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block">إجمالي المسدد له</span>
                <span className="font-bold font-mono text-sm text-success">
                  {formatCurrency(detailsSupplier.total_paid)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block">الرصيد المستحق</span>
                <span className="font-bold font-mono text-sm text-warning">
                  {formatCurrency(detailsSupplier.balance)}
                </span>
              </div>
            </div>

            {/* Purchases List */}
            <div>
              <h3 className="font-bold text-xs text-foreground mb-2">سجل فواتير التوريد</h3>
              {detailsSupplier.purchases.length === 0 ? (
                <p className="text-muted-foreground py-2">لا توجد فواتير مسجلة من هذا المورد.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detailsSupplier.purchases.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded border border-border/70 bg-background"
                    >
                      <div>
                        <span className="font-mono font-semibold text-primary">{p.invoice_number}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          {formatDateTime(p.created_at)}
                        </span>
                      </div>
                      <div className="text-left font-mono font-bold">
                        {formatCurrency(p.total)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions Ledger */}
            <div>
              <h3 className="font-bold text-xs text-foreground mb-2">سجل الدفعات وسندات الصرف</h3>
              {detailsSupplier.transactions.length === 0 ? (
                <p className="text-muted-foreground py-2">لا توجد سندات أو دفعات مسجلة.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detailsSupplier.transactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded border border-border/70 bg-background"
                    >
                      <div>
                        <Badge variant={t.type === "PAYMENT" ? "success" : "warning"} className="text-[10px]">
                          {t.type === "PAYMENT" ? "سند صرف / سداد" : "فاتورة شراء"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          {t.notes} • {formatDateTime(t.created_at)}
                        </span>
                      </div>
                      <div className="text-left font-mono font-bold">
                        {formatCurrency(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Sheet>
      )}

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف المورد"
        description={`إنت متأكد إنك عايز تحذف المورد "${deleteTarget?.name}"؟`}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        onConfirm={handleDeleteConfirm}
        variant="danger"
      />
    </div>
  );
}
