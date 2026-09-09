// ==========================================================
// src/features/customers/CustomersPage.tsx
// موديول إدارة العملاء والمديونيات وكشف الحساب وسندات القبض
// ==========================================================

import * as React from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CreditCard,
  Phone,
  MapPin,
  FileText,
  Search,
  CheckCircle2,
} from "lucide-react";
import { customerRepository, CustomerDetailsDTO } from "@/database/repositories/customerRepository";
import { CustomerRow } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function CustomersPage() {
  const { user, hasPermission } = useAuthStore();
  const canCreate = hasPermission("customers.create");
  const canUpdate = hasPermission("customers.update");
  const canDelete = hasPermission("customers.delete");

  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Create / Edit Modal
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<CustomerRow | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Statement Sheet
  const [detailsCustomer, setDetailsCustomer] = React.useState<CustomerDetailsDTO | null>(null);

  // Payment Dialog (سند قبض)
  const [paymentCustomer, setPaymentCustomer] = React.useState<CustomerRow | null>(null);
  const [paymentAmount, setPaymentAmount] = React.useState<number>(0);
  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [paymentError, setPaymentError] = React.useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = React.useState<CustomerRow | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await customerRepository.getAll();
      setCustomers(list);
    } catch (err) {
      console.error("فشل تحميل العملاء:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setAddress("");
    setNotes("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (c: CustomerRow) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || "");
    setAddress(c.address || "");
    setNotes(c.notes || "");
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("اسم العميل مطلوب");
      return;
    }

    setSubmitting(true);
    try {
      if (editingCustomer) {
        await customerRepository.update(editingCustomer.id, {
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await customerRepository.create({
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          is_active: 1,
        });
      }

      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "حدث خطأ أثناء حفظ العميل");
    } finally {
      setSubmitting(false);
    }
  };

  const openStatement = async (c: CustomerRow) => {
    const details = await customerRepository.getById(c.id);
    setDetailsCustomer(details);
  };

  const openPaymentDialog = (c: CustomerRow) => {
    setPaymentCustomer(c);
    setPaymentAmount(c.balance > 0 ? c.balance : 0);
    setPaymentNotes("سداد نقدي من العميل");
    setPaymentError(null);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    setPaymentError(null);

    if (paymentAmount <= 0) {
      setPaymentError("المبلغ المدفوع يجب أن يكون أكبر من الصفر");
      return;
    }

    setSubmitting(true);
    try {
      await customerRepository.recordPayment(
        paymentCustomer.id,
        paymentAmount,
        paymentNotes.trim(),
        user?.id || "user-admin"
      );
      setPaymentCustomer(null);
      await loadData();
      if (detailsCustomer?.id === paymentCustomer.id) {
        openStatement(paymentCustomer);
      }
    } catch (err: any) {
      setPaymentError(err?.message || "فشل تسجيل الدفعة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await customerRepository.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "تعذر حذف العميل");
    }
  };

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة بيانات العملاء، حسابات الديون، وكشوف الحساب وسندات القبض.
          </p>
        </div>

        {canCreate && (
          <Button onClick={openCreateDialog} size="sm" className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>إضافة عميل جديد</span>
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو رقم الهاتف..."
          className="pr-9 h-9 text-xs"
        />
      </div>

      {/* Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل العملاء...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="لسه مفيش عملاء مسجلين"
                description="سجل أول عميل لمتابعة فواتيره الآجلة ومسحوباته وسندات السداد."
                actionText={canCreate ? "+ إضافة عميل جديد" : undefined}
                onAction={canCreate ? openCreateDialog : undefined}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead className="text-center font-bold">الرصيد (مديونية)</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead className="w-36 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, idx) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-sm">
                      {c.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {c.phone || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.address || "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-sm">
                      {c.balance > 0 ? (
                        <span className="text-danger font-semibold">{formatCurrency(c.balance)}</span>
                      ) : (
                        <span className="text-success text-xs">خالص الحساب</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                      {c.notes || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => openStatement(c)}
                          title="كشف الحساب"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {c.balance > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:bg-success/10"
                            onClick={() => openPaymentDialog(c)}
                            title="سند قبض وسداد"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning hover:bg-warning/10"
                            onClick={() => openEditDialog(c)}
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
                            onClick={() => setDeleteTarget(c)}
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
            <DialogTitle>{editingCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات التواصل الخاصة بالعميل.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomer} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                {formError}
              </div>
            )}

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">اسم العميل *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شركة المقاولون أو محمود أحمد"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">رقم الهاتف</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010xxxxxxxx"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">العنوان</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="المدينة / المنطقة / الشارع"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">ملاحظات</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="نوع التعامل، مهندس ديكور، مقاول..."
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : editingCustomer ? "حفظ التعديل" : "إضافة العميل"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RECORD PAYMENT (سند قبض) DIALOG */}
      <Dialog open={!!paymentCustomer} onOpenChange={(open) => !open && setPaymentCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل سند قبض ودفع نقدي</DialogTitle>
            <DialogDescription>
              سداد دفعة من العميل <span className="font-bold text-foreground">{paymentCustomer?.name}</span>
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
                <span>إجمالي مديونية العميل الحالية:</span>
                <span className="font-mono font-bold text-danger text-sm">
                  {formatCurrency(paymentCustomer?.balance || 0)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">المبلغ المقبوض والمسدد (ج.م) *</label>
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
                placeholder="دفعة تحت الحساب، شيك، تحويل بنكي..."
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentCustomer(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="success" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "تأكيد سند القبض"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* STATEMENT OF ACCOUNT SHEET */}
      {detailsCustomer && (
        <Sheet open={!!detailsCustomer} onOpenChange={(open) => !open && setDetailsCustomer(null)}>
          <SheetHeader>
            <SheetTitle>كشف حساب العميل</SheetTitle>
            <SheetDescription>{detailsCustomer.name}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 my-4 text-xs text-right">
            {/* KPI Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block">إجمالي المسحوبات</span>
                <span className="font-bold font-mono text-sm text-foreground">
                  {formatCurrency(detailsCustomer.total_sales)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block">إجمالي المسدد</span>
                <span className="font-bold font-mono text-sm text-success">
                  {formatCurrency(detailsCustomer.total_paid)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground block">الرصيد المتبقي</span>
                <span className="font-bold font-mono text-sm text-danger">
                  {formatCurrency(detailsCustomer.balance)}
                </span>
              </div>
            </div>

            {/* Invoices List */}
            <div>
              <h3 className="font-bold text-xs text-foreground mb-2">سجل الفواتير السابقة</h3>
              {detailsCustomer.sales.length === 0 ? (
                <p className="text-muted-foreground py-2">لا توجد فواتير مسجلة لهذا العميل.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detailsCustomer.sales.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded border border-border/70 bg-background"
                    >
                      <div>
                        <span className="font-mono font-semibold text-primary">{s.invoice_number}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          {formatDateTime(s.created_at)}
                        </span>
                      </div>
                      <div className="text-left font-mono font-bold">
                        {formatCurrency(s.total)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions / Payments Ledger */}
            <div>
              <h3 className="font-bold text-xs text-foreground mb-2">سجل المعاملات والمدفوعات</h3>
              {detailsCustomer.transactions.length === 0 ? (
                <p className="text-muted-foreground py-2">لا توجد سندات أو حركات مسجلة.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detailsCustomer.transactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded border border-border/70 bg-background"
                    >
                      <div>
                        <Badge variant={t.type === "PAYMENT" ? "success" : "warning"} className="text-[10px]">
                          {t.type === "PAYMENT" ? "سند قبض / سداد" : "فاتورة بيع"}
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
        title="حذف العميل"
        description={`إنت متأكد إنك عايز تحذف العميل "${deleteTarget?.name}"؟`}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        onConfirm={handleDeleteConfirm}
        variant="danger"
      />
    </div>
  );
}
