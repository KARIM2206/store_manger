// ==========================================================
// src/features/inventory/InventoryPage.tsx
// موديول المخزون وسجل حركات المخزن (Stock Ledger)
// ==========================================================

import * as React from "react";
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  History,
  AlertTriangle,
  Search,
  CheckCircle2,
} from "lucide-react";
import { inventoryRepository, StockAdjustmentDTO } from "@/database/repositories/inventoryRepository";
import { productRepository } from "@/database/repositories/productRepository";
import { ProductRow, StockMovementRow } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function InventoryPage() {
  const { user, hasPermission } = useAuthStore();
  const canAdjust = hasPermission("inventory.adjust");

  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("balance");

  // Balance Tab State
  const [stockItems, setStockItems] = React.useState<(ProductRow & { status: "متوفر" | "منخفض" | "نفد" })[]>([]);
  const [totalValue, setTotalValue] = React.useState(0);
  const [lowCount, setLowCount] = React.useState(0);
  const [outCount, setOutCount] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Ledger Tab State
  const [movements, setMovements] = React.useState<StockMovementRow[]>([]);

  // Adjustment Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [adjustType, setAdjustType] = React.useState<"ADJUSTMENT_IN" | "ADJUSTMENT_OUT">("ADJUSTMENT_IN");
  const [selectedProductId, setSelectedProductId] = React.useState<string>("");
  const [adjustQuantity, setAdjustQuantity] = React.useState<number>(1);
  const [adjustReason, setAdjustReason] = React.useState<string>("");
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const inv = await inventoryRepository.getInventoryStatus();
      setStockItems(inv.items);
      setTotalValue(inv.totalStockValue);
      setLowCount(inv.lowStockCount);
      setOutCount(inv.outOfStockCount);

      if (inv.items.length > 0 && !selectedProductId) {
        setSelectedProductId(inv.items[0].id);
      }

      const movs = await inventoryRepository.getMovements();
      setMovements(movs);
    } catch (err) {
      console.error("خطأ أثناء تحميل المخزون:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const openAdjustDialog = (
    type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT",
    product?: ProductRow
  ) => {
    setAdjustType(type);
    if (product) {
      setSelectedProductId(product.id);
    }
    setAdjustQuantity(1);
    setAdjustReason(
      type === "ADJUSTMENT_IN" ? "إضافة بضاعة للمخزن / جرد زائد" : "سحب تالف أو عينات / تسوية جرد"
    );
    setModalError(null);
    setModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedProductId) {
      setModalError("يرجى اختيار المنتج");
      return;
    }
    if (adjustQuantity <= 0) {
      setModalError("الكمية يجب أن تكون أكبر من الصفر");
      return;
    }
    if (!adjustReason.trim()) {
      setModalError("يرجى كتابة سبب الحركة");
      return;
    }

    setSubmitting(true);
    try {
      await inventoryRepository.adjustStock({
        productId: selectedProductId,
        type: adjustType,
        quantity: adjustQuantity,
        reason: adjustReason.trim(),
        userId: user?.id || "user-admin",
      });

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setModalError(err?.message || "حدث خطأ أثناء تسوية المخزون");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = stockItems.filter((i) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      i.name.toLowerCase().includes(q) ||
      (i.sku && i.sku.toLowerCase().includes(q))
    );
  });

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "PURCHASE":
        return <Badge variant="success">توريد شراء (+)</Badge>;
      case "SALE":
        return <Badge variant="destructive">فاتورة بيع (-)</Badge>;
      case "ADJUSTMENT_IN":
        return <Badge variant="info">إضافة تسوية (+)</Badge>;
      case "ADJUSTMENT_OUT":
        return <Badge variant="warning">سحب تسوية (-)</Badge>;
      case "RETURN_IN":
        return <Badge variant="secondary">مرتجع مبيعات (+)</Badge>;
      case "RETURN_OUT":
        return <Badge variant="secondary">مرتجع مشتريات (-)</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المخزون</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            الرصيد اللحظي وسجل حركات المخزن بدقة المحاسبة (Stock Ledger).
          </p>
        </div>

        {canAdjust && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => openAdjustDialog("ADJUSTMENT_IN")}
              variant="outline"
              size="sm"
              className="gap-1.5 shadow-xs text-success border-success/30 hover:bg-success/10"
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>إضافة للمخزون</span>
            </Button>
            <Button
              onClick={() => openAdjustDialog("ADJUSTMENT_OUT")}
              variant="outline"
              size="sm"
              className="gap-1.5 shadow-xs text-warning border-warning/30 hover:bg-warning/10"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>سحب من المخزون</span>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              قيمة البضاعة المخزنة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground font-mono">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">بناءً على سعر التكلفة الحالي</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-warning flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>أصناف تحت الحد الأدنى</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-warning font-mono">{lowCount} صنف</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">تحتاج طلب توريد قريب</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-danger flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>أصناف نفدت بالكامل</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-danger font-mono">{outCount} صنف</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">رصيدها صفر حالياً</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="balance" className="gap-2">
              <Boxes className="h-4 w-4" />
              <span>أرصدة المخزون الحالية</span>
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-2">
              <History className="h-4 w-4" />
              <span>سجل حركات المخزن (Ledger)</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === "balance" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن منتج في المخزن..."
                className="pr-8 h-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* TAB 1: STOCK BALANCES */}
        <TabsContent value="balance">
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-sm text-muted-foreground">جاري فحص أرصدة المخزن...</div>
              ) : filteredItems.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Boxes}
                    title="لا توجد بيانات مطابقة"
                    description="تأكد من اسم الصنف أو أضف منتجات جديدة."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الكود</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead className="text-center">الوحدة</TableHead>
                      <TableHead className="text-center font-bold">الرصيد الحالي</TableHead>
                      <TableHead className="text-center">الحد الأدنى</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      {canAdjust && <TableHead className="w-24 text-center">تسوية</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center text-xs font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-sm">
                          {item.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.sku || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {item.category_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {item.unit_symbol}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-base">
                          {item.current_stock}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {item.minimum_stock}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              item.status === "متوفر"
                                ? "success"
                                : item.status === "منخفض"
                                ? "warning"
                                : "destructive"
                            }
                            className="text-xs font-medium"
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        {canAdjust && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-primary"
                                onClick={() => openAdjustDialog("ADJUSTMENT_IN", item)}
                              >
                                تسوية
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MOVEMENTS LEDGER */}
        <TabsContent value="ledger">
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={History}
                    title="سجل الحركات فارغ"
                    description="أي عملية بيع أو شراء أو تسوية يدوية ستسجل هنا آلياً لحفظ حركة المخزون."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead className="text-center">نوع الحركة</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-center">قبل الحركة</TableHead>
                      <TableHead className="text-center">بعد الحركة</TableHead>
                      <TableHead>السبب / المرجع</TableHead>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>التاريخ والوقت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-semibold text-sm">
                          {m.product_name || "منتج"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getMovementBadge(m.type)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-sm">
                          {m.type === "SALE" || m.type === "ADJUSTMENT_OUT" || m.type === "RETURN_OUT"
                            ? `-${m.quantity}`
                            : `+${m.quantity}`}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {m.before_quantity}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm font-semibold">
                          {m.after_quantity}
                        </TableCell>
                        <TableCell className="text-xs text-foreground">
                          {m.reason || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.user_name || "المسؤول"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {formatDateTime(m.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADJUSTMENT DIALOG */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {adjustType === "ADJUSTMENT_IN" ? "إضافة رصيد للمخزون" : "سحب رصيد من المخزون"}
            </DialogTitle>
            <DialogDescription>
              كل تسوية للمخزن تسجل في الدفتر المحاسبي لحماية عهدة المخزن.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            {modalError && (
              <div className="rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                {modalError}
              </div>
            )}

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">المنتج *</label>
              <Select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {stockItems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (الرصيد الحالي: {p.current_stock})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">نوع التسوية</label>
              <Select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
              >
                <option value="ADJUSTMENT_IN">إضافة للمخزن (+)</option>
                <option value="ADJUSTMENT_OUT">سحب من المخزن (-)</option>
              </Select>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">الكمية *</label>
              <Input
                type="number"
                min="0.1"
                step="any"
                required
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">السبب / الملاحظات *</label>
              <Input
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="مثال: جرد سنوي، بضاعة تالفة، عينات للعميل..."
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "تأكيد حركة المخزن"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
