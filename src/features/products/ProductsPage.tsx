// ==========================================================
// src/features/products/ProductsPage.tsx
// موديول إدارة المنتجات الكامل مع الجداول والفلترة والنماذج
// ==========================================================

import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Package,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  Eye,
  SlidersHorizontal,
  Barcode as BarcodeIcon,
} from "lucide-react";
import { productRepository, CreateProductDTO } from "@/database/repositories/productRepository";
import { categoryRepository, CategoryWithCount } from "@/database/repositories/categoryRepository";
import { getDatabase } from "@/database/connection";
import { ProductRow, UnitRow } from "@/types/database";
import { useFeature } from "@/stores/featureStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasBarcode = useFeature("barcode");
  const { user, hasPermission } = useAuthStore();

  const canCreate = hasPermission("products.create");
  const canUpdate = hasPermission("products.update");
  const canDelete = hasPermission("products.delete");

  // State
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [categories, setCategories] = React.useState<CategoryWithCount[]>([]);
  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] = React.useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 8;

  // Dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ProductRow | null>(null);
  const [detailsProduct, setDetailsProduct] = React.useState<ProductRow | null>(null);
  const [deleteProduct, setDeleteProduct] = React.useState<ProductRow | null>(null);

  // Form State
  const [formData, setFormData] = React.useState<CreateProductDTO>({
    name: "",
    sku: "",
    barcode: "",
    category_id: "",
    unit_id: "",
    purchase_price: 0,
    selling_price: 0,
    minimum_stock: 5,
    maximum_stock: null,
    initial_stock: 0,
    description: "",
    notes: "",
  });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const prods = await productRepository.getAll();
      const cats = await categoryRepository.getAll();
      const db = await getDatabase();
      const u = await db.select<UnitRow[]>(`SELECT * FROM units ORDER BY name ASC`);

      setProducts(prods);
      setCategories(cats);
      setUnits(u);

      // Set default category and unit for form if not set
      if (cats.length > 0 && !formData.category_id) {
        setFormData((prev) => ({ ...prev, category_id: cats[0].id }));
      }
      if (u.length > 0 && !formData.unit_id) {
        setFormData((prev) => ({ ...prev, unit_id: u[0].id }));
      }
    } catch (err) {
      console.error("خطأ أثناء تحميل المنتجات:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Check URL query param ?action=add
  React.useEffect(() => {
    if (searchParams.get("action") === "add") {
      openCreateDialog();
      setSearchParams({});
    }
  }, [searchParams]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: `SKU-${Date.now().toString().slice(-5)}`,
      barcode: hasBarcode ? `622${Date.now().toString().slice(-9)}` : "",
      category_id: categories.length > 0 ? categories[0].id : "",
      unit_id: units.length > 0 ? units[0].id : "",
      purchase_price: 0,
      selling_price: 0,
      minimum_stock: 5,
      maximum_stock: null,
      initial_stock: 0,
      description: "",
      notes: "",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (product: ProductRow) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      category_id: product.category_id,
      unit_id: product.unit_id,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      minimum_stock: product.minimum_stock,
      maximum_stock: product.maximum_stock,
      description: product.description || "",
      notes: product.notes || "",
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("اسم المنتج مطلوب");
      return;
    }
    if (!formData.category_id) {
      setFormError("يرجى اختيار التصنيف");
      return;
    }
    if (!formData.unit_id) {
      setFormError("يرجى اختيار الوحدة");
      return;
    }
    if (formData.selling_price < 0 || formData.purchase_price < 0) {
      setFormError("الأسعار لا يمكن أن تكون سالبة");
      return;
    }

    setSubmitting(true);
    try {
      if (editingProduct) {
        await productRepository.update(editingProduct.id, formData);
      } else {
        await productRepository.create(formData, user?.id || "user-admin");
      }
      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "حدث خطأ أثناء حفظ المنتج");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProduct) return;
    try {
      await productRepository.delete(deleteProduct.id);
      setDeleteProduct(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "تعذر حذف المنتج");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = ["الاسم", "الكود", "التصنيف", "الوحدة", "سعر الشراء", "سعر البيع", "الكمية الحالية", "الحد الأدنى"];
    const rows = products.map((p) => [
      `"${p.name}"`,
      `"${p.sku || ""}"`,
      `"${p.category_name || ""}"`,
      `"${p.unit_symbol || ""}"`,
      p.purchase_price,
      p.selling_price,
      p.current_stock,
      p.minimum_stock,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered products
  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q));

    const matchesCategory = selectedCategory === "ALL" || p.category_id === selectedCategory;

    let matchesStock = true;
    if (stockStatusFilter === "AVAILABLE") matchesStock = p.current_stock > p.minimum_stock;
    if (stockStatusFilter === "LOW") matchesStock = p.current_stock <= p.minimum_stock && p.current_stock > 0;
    if (stockStatusFilter === "OUT") matchesStock = p.current_stock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Paged
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="page-container space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة المنتجات والأسعار والكميات بسهولة في مكان واحد.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-1.5 shadow-xs flex-1 md:flex-none">
            <Download className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">تصدير CSV</span>
            <span className="sm:hidden">تصدير</span>
          </Button>
          {canCreate && (
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5 shadow-xs flex-1 md:flex-none">
              <Plus className="h-4 w-4 shrink-0" />
              <span>إضافة منتج</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="بحث باسم المنتج، الكود..."
                className="pr-9 h-9 text-xs w-full"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-48">
              <Select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs"
              >
                <option value="ALL">كل التصنيفات</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Stock Status Filter */}
            <div className="w-full sm:w-44">
              <Select
                value={stockStatusFilter}
                onChange={(e) => {
                  setStockStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs"
              >
                <option value="ALL">كل الحالات</option>
                <option value="AVAILABLE">متوفر</option>
                <option value="LOW">مخزون منخفض</option>
                <option value="OUT">نفد من المخزن</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Data Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">جاري تحميل المنتجات...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Package}
                title="لسه مفيش منتجات تطابق البحث"
                description={
                  products.length === 0
                    ? "ابدأ بإضافة أول منتج للمخزن لتتمكن من البيع والشراء ومتابعة الكميات."
                    : "جرب تغيير كلمات البحث أو الفلاتر لتجد ما تبحث عنه."
                }
                actionText={canCreate ? "+ إضافة منتج" : undefined}
                onAction={canCreate ? openCreateDialog : undefined}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكود (SKU)</TableHead>
                    {hasBarcode && <TableHead>الباركود</TableHead>}
                    <TableHead>التصنيف</TableHead>
                    <TableHead className="text-center">الوحدة</TableHead>
                    <TableHead>سعر الشراء</TableHead>
                    <TableHead>سعر البيع</TableHead>
                    <TableHead className="text-center">الكمية</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="w-16 text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedProducts.map((product, idx) => {
                    const stock = Number(product.current_stock);
                    const min = Number(product.minimum_stock);

                    let statusVariant: "success" | "warning" | "destructive" = "success";
                    let statusText = "متوفر";
                    if (stock <= 0) {
                      statusVariant = "destructive";
                      statusText = "نفد";
                    } else if (stock <= min) {
                      statusVariant = "warning";
                      statusText = "منخفض";
                    }

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground text-sm block">
                            {product.name}
                          </span>
                          {product.description && (
                            <span className="text-[11px] text-muted-foreground block truncate max-w-xs">
                              {product.description}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {product.sku || "—"}
                        </TableCell>
                        {hasBarcode && (
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {product.barcode ? (
                              <span className="inline-flex items-center gap-1">
                                <BarcodeIcon className="h-3 w-3" />
                                {product.barcode}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {product.category_name || "بدون"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {product.unit_symbol || product.unit_name}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {formatCurrency(product.purchase_price)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground font-mono">
                          {formatCurrency(product.selling_price)}
                        </TableCell>
                        <TableCell className="text-center font-bold font-mono text-sm">
                          {stock}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusVariant} className="text-[11px] font-medium">
                            {statusText}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <span className="text-base font-bold">⋮</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="left" className="w-32">
                              <DropdownMenuItem onClick={() => setDetailsProduct(product)}>
                                <Eye className="h-3.5 w-3.5 ml-2 text-info" />
                                <span>عرض</span>
                              </DropdownMenuItem>
                              {canUpdate && (
                                <DropdownMenuItem onClick={() => openEditDialog(product)}>
                                  <Edit2 className="h-3.5 w-3.5 ml-2 text-warning" />
                                  <span>تعديل</span>
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  destructive
                                  onClick={() => setDeleteProduct(product)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 ml-2 text-danger" />
                                  <span>حذف</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination Bar */}
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <div>
                  عرض {(currentPage - 1) * pageSize + 1} إلى{" "}
                  {Math.min(currentPage * pageSize, filtered.length)} من أصل {filtered.length} منتج
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2 text-xs"
                  >
                    السابق
                  </Button>
                  <span className="px-2 font-medium text-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-7 px-2 text-xs"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "تعديل بيانات المنتج" : "إضافة منتج جديد"}</DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "قم بتحديث أسعار أو بيانات المنتج."
                : "أدخل بيانات المنتج الجديد وسعره الأولي."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                {formError}
              </div>
            )}

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">اسم المنتج *</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: سيراميك أرضيات 60×60 فرز أول"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">كود المنتج (SKU)</label>
                <Input
                  value={formData.sku || ""}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="CER-FL-6060"
                />
              </div>

              {hasBarcode && (
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-foreground">الباركود</label>
                  <Input
                    value={formData.barcode || ""}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="622100100101"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">التصنيف *</label>
                <Select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">الوحدة *</label>
                <Select
                  value={formData.unit_id}
                  onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">سعر الشراء (التكلفة)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">سعر البيع *</label>
                <Input
                  type="number"
                  step="0.5"
                  required
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground">الحد الأدنى للمخزون (للتنبيه)</label>
                <Input
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({ ...formData, minimum_stock: Number(e.target.value) })}
                />
              </div>

              {!editingProduct && (
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-foreground">الرصيد الافتتاحي الأولي</label>
                  <Input
                    type="number"
                    value={formData.initial_stock || 0}
                    onChange={(e) => setFormData({ ...formData, initial_stock: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">وصف المنتج</label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="مواصفات إضافية، المقاس، الشركة المصنعة..."
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : editingProduct ? "تعديل المنتج" : "إضافة المنتج"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      {detailsProduct && (
        <Dialog open={!!detailsProduct} onOpenChange={(open) => !open && setDetailsProduct(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تفاصيل المنتج</DialogTitle>
              <DialogDescription>{detailsProduct.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-xs text-right divide-y divide-border">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">كود الصنف (SKU):</span>
                <span className="font-mono font-semibold">{detailsProduct.sku || "—"}</span>
              </div>
              {hasBarcode && (
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">الباركود:</span>
                  <span className="font-mono font-semibold">{detailsProduct.barcode || "—"}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">التصنيف:</span>
                <span>{detailsProduct.category_name}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">الوحدة:</span>
                <span>{detailsProduct.unit_name}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">سعر الشراء:</span>
                <span className="font-mono">{formatCurrency(detailsProduct.purchase_price)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">سعر البيع:</span>
                <span className="font-mono font-bold text-primary">
                  {formatCurrency(detailsProduct.selling_price)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">الكمية الحالية في المخزن:</span>
                <span className="font-bold text-sm">{detailsProduct.current_stock}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">الحد الأدنى:</span>
                <span>{detailsProduct.minimum_stock}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsProduct(null)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
        title="حذف المنتج"
        description={`إنت متأكد إنك عايز تحذف المنتج "${deleteProduct?.name}"؟ سيتم تعطيل المنتج مع الحفاظ على سجل المبيعات والمشتريات السابقة.`}
        confirmText="نعم، احذف المنتج"
        cancelText="إلغاء"
        onConfirm={handleDeleteConfirm}
        variant="danger"
      />
    </div>
  );
}
