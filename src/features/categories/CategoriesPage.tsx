// ==========================================================
// src/features/categories/CategoriesPage.tsx
// موديول إدارة التصنيفات وحماية الحذف
// ==========================================================

import * as React from "react";
import { Layers, Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { categoryRepository, CategoryWithCount } from "@/database/repositories/categoryRepository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export function CategoriesPage() {
  const [categories, setCategories] = React.useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Form State
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryWithCount | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = React.useState<CategoryWithCount | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await categoryRepository.getAll();
      setCategories(data);
    } catch (err) {
      console.error("فشل تحميل التصنيفات:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setError(null);
    setFormOpen(true);
  };

  const openEditDialog = (cat: CategoryWithCount) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setError(null);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("اسم التصنيف مطلوب");
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await categoryRepository.update(editingCategory.id, name.trim(), description.trim());
      } else {
        await categoryRepository.create(name.trim(), description.trim());
      }
      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء حفظ التصنيف");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await categoryRepository.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "تعذر حذف التصنيف");
    }
  };

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التصنيفات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تقسيم أصناف المخزن لمجموعات يسهل فرزها والبحث فيها.
          </p>
        </div>

        <Button onClick={openCreateDialog} size="sm" className="gap-1.5 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>إضافة تصنيف</span>
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">جاري تحميل التصنيفات...</div>
          ) : categories.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Layers}
                title="لسه مفيش تصنيفات"
                description="ابدأ بإضافة أول تصنيف للمنتجات لتنظيم المخزن."
                actionText="+ إضافة تصنيف"
                onAction={openCreateDialog}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>اسم التصنيف</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead className="text-center">عدد المنتجات</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead className="w-24 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat, idx) => (
                  <TableRow key={cat.id}>
                    <TableCell className="text-center text-xs text-muted-foreground font-mono">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-sm">
                      {cat.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cat.description || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {cat.products_count} منتج
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="success" className="text-[11px]">
                        نشط
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(cat.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                          onClick={() => openEditDialog(cat)}
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10"
                          onClick={() => {
                            if (cat.products_count > 0) {
                              alert(
                                `لا يمكن حذف تصنيف "${cat.name}" لأنه يحتوي على ${cat.products_count} منتج. قم بنقل المنتجات لتصنيف آخر أولاً.`
                              );
                              return;
                            }
                            setDeleteTarget(cat);
                          }}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
            <DialogTitle>{editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "تعديل اسم ووصف التصنيف الحالي." : "أدخل اسم التصنيف وملاحظاته."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">اسم التصنيف *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: سيراميك، بورسلين، مواد لاصقة..."
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">الوصف</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر للأصناف التابعة لهذا التصنيف"
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : editingCategory ? "حفظ التعديل" : "إضافة التصنيف"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف التصنيف"
        description={`إنت متأكد إنك عايز تحذف التصنيف "${deleteTarget?.name}"؟`}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}
