// ==========================================================
// src/features/sales/SalesPage.tsx
// نقطة البيع السريعة (POS) وإصدار فواتير المبيعات
// ==========================================================

import * as React from "react";
import {
  ShoppingCart,
  Search,
  Barcode as BarcodeIcon,
  Trash2,
  Plus,
  Minus,
  Check,
  Printer,
  History,
  AlertCircle,
  Package,
  RotateCcw,
} from "lucide-react";
import { salesRepository } from "@/database/repositories/salesRepository";
import { productRepository } from "@/database/repositories/productRepository";
import { customerRepository } from "@/database/repositories/customerRepository";
import { settingsRepository } from "@/database/repositories/settingsRepository";
import { printService } from "@/services/printService";
import { ProductRow, CustomerRow, SaleRow } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { useFeature } from "@/stores/featureStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface CartItem {
  product: ProductRow;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export function SalesPage() {
  const { user } = useAuthStore();
  const hasBarcode = useFeature("barcode");
  const hasCustomers = useFeature("customers");

  const [activeTab, setActiveTab] = React.useState<"pos" | "history">("pos");
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [allowNegativeStock, setAllowNegativeStock] = React.useState(false);
  const [storeInfo, setStoreInfo] = React.useState({ name: "مخزن ومحلات الأمل", phone: "01001234567" });

  // POS State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [overallDiscount, setOverallDiscount] = React.useState<number>(0);
  const [paymentType, setPaymentType] = React.useState<"CASH" | "CREDIT" | "PARTIAL">("CASH");
  const [paidAmount, setPaidAmount] = React.useState<number>(0);
  const [notes, setNotes] = React.useState("");
  const [barcodeInput, setBarcodeInput] = React.useState("");

  // History State
  const [salesHistory, setSalesHistory] = React.useState<SaleRow[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  // Success Modal State
  const [lastCreatedSale, setLastCreatedSale] = React.useState<SaleRow | null>(null);
  const [successModalOpen, setSuccessModalOpen] = React.useState(false);
  const [posError, setPosError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  
  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [saleToCancel, setSaleToCancel] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState(false);

  const loadInitialData = async () => {
    try {
      const prods = await productRepository.getAll();
      setProducts(prods);

      if (hasCustomers) {
        const custs = await customerRepository.getAll();
        setCustomers(custs);
      }

      const allowNeg = await settingsRepository.getSetting("allow_negative_stock", "false");
      setAllowNegativeStock(allowNeg === "true");

      const sName = await settingsRepository.getSetting("store_name", "مخزن ومحلات الأمل");
      const sPhone = await settingsRepository.getSetting("phone", "01001234567");
      setStoreInfo({ name: sName, phone: sPhone });
    } catch (e) {
      console.error("فشل تحميل بيانات المبيعات:", e);
    }
  };

  const loadSalesHistory = async () => {
    setHistoryLoading(true);
    try {
      const hist = await salesRepository.getAll(50);
      setSalesHistory(hist);
    } catch (e) {
      console.error("فشل تحميل سجل المبيعات:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  React.useEffect(() => {
    loadInitialData();
  }, [hasCustomers]);

  React.useEffect(() => {
    if (activeTab === "history") {
      loadSalesHistory();
    }
  }, [activeTab]);

  // Add Product to Cart
  const addToCart = (product: ProductRow) => {
    setPosError(null);
    const existingIndex = cart.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      const currentCartQty = cart[existingIndex].quantity;
      if (!allowNegativeStock && currentCartQty + 1 > product.current_stock) {
        setPosError(`الرصيد المتاح من "${product.name}" هو ${product.current_stock} فقط.`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      if (!allowNegativeStock && product.current_stock < 1) {
        setPosError(`المنتج "${product.name}" نفد من المخزن.`);
        return;
      }
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: product.selling_price,
          discount: 0,
        },
      ]);
    }
  };

  // Barcode enter event
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) => p.barcode === barcodeInput.trim() || (p.sku && p.sku.toLowerCase() === barcodeInput.trim().toLowerCase())
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput("");
    } else {
      setPosError(`لم يتم العثور على منتج بالباركود: ${barcodeInput}`);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    if (!allowNegativeStock && newQty > item.product.current_stock) {
      setPosError(`الرصيد المتاح من "${item.product.name}" هو ${item.product.current_stock} فقط.`);
      return;
    }
    const newCart = [...cart];
    newCart[index].quantity = newQty;
    setCart(newCart);
  };

  const updateUnitPrice = (index: number, price: number) => {
    const newCart = [...cart];
    newCart[index].unitPrice = Math.max(0, price);
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const clearCart = () => {
    setCart([]);
    setOverallDiscount(0);
    setPaymentType("CASH");
    setPaidAmount(0);
    setNotes("");
    setPosError(null);
  };

  // Calculations
  const subtotal = cart.reduce((acc, i) => acc + i.quantity * i.unitPrice - i.discount, 0);
  const grandTotal = Math.max(0, subtotal - overallDiscount);

  // Auto-set paid amount if cash
  React.useEffect(() => {
    if (paymentType === "CASH") {
      setPaidAmount(grandTotal);
    } else if (paymentType === "CREDIT") {
      setPaidAmount(0);
    }
  }, [paymentType, grandTotal]);

  const handleConfirmSale = async () => {
    setPosError(null);
    if (cart.length === 0) {
      setPosError("السلة فارغة. أضف منتجات أولاً.");
      return;
    }

    if (paymentType === "CREDIT" && !selectedCustomerId) {
      setPosError("يجب اختيار العميل عند البيع الآجل.");
      return;
    }

    setSubmitting(true);
    try {
      const sale = await salesRepository.createSale({
        customerId: selectedCustomerId || null,
        userId: user?.id || "user-admin",
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
        discount: overallDiscount,
        paymentType,
        paidAmount,
        notes: notes.trim() || null,
      });

      setLastCreatedSale(sale);
      setSuccessModalOpen(true);
      clearCart();
      await loadInitialData(); // reload product stock
    } catch (err: any) {
      setPosError(err?.message || "حدث خطأ أثناء حفظ الفاتورة");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = async (saleId?: string) => {
    const targetSale = saleId
      ? await salesRepository.getById(saleId)
      : lastCreatedSale
      ? await salesRepository.getById(lastCreatedSale.id)
      : null;

    if (!targetSale) return;
    printService.printSaleReceipt(targetSale, targetSale.items, storeInfo.name, storeInfo.phone);
  };

  const confirmCancelSale = async () => {
    if (!saleToCancel) return;
    setCancelling(true);
    try {
      await salesRepository.cancelSale(saleToCancel, user?.id || "user-admin");
      setCancelModalOpen(false);
      setSaleToCancel(null);
      await loadSalesHistory();
      await loadInitialData(); // Reload stock in POS view
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء الإلغاء");
    } finally {
      setCancelling(false);
    }
  };

  // Search filtered products for quick picker
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q))
    );
  });

  return (
    <div className="space-y-4 select-none" dir="rtl">
      {/* Header and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">شاشة المبيعات (POS)</h1>
            <p className="text-xs text-muted-foreground">تسجيل فواتير البيع الفورية وإصدار إيصالات الاستلام.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-muted">
            <TabsTrigger value="pos" className="gap-1.5 text-xs">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>نقطة البيع</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" />
              <span>سجل الفواتير السابقة</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "pos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* RIGHT/CENTER: PRODUCTS PICKER (7 COLS) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search & Barcode Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7 relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتج بالاسم أو الكود..."
                  className="pr-9 h-9 text-xs"
                />
              </div>

              {hasBarcode && (
                <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 relative">
                  <BarcodeIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="مسح الباركود (Enter)..."
                    className="pr-9 h-9 text-xs font-mono"
                  />
                </form>
              )}
            </div>

            {/* Error Message */}
            {posError && (
              <div className="flex items-center gap-2 rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{posError}</span>
              </div>
            )}

            {/* Products Grid */}
            <Card className="border-border shadow-xs">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto p-1">
                  {filteredProducts.map((p) => {
                    const isOutOfStock = p.current_stock <= 0;
                    return (
                      <div
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className={`flex flex-col justify-between p-3 rounded-lg border text-right transition-all cursor-pointer select-none ${
                          isOutOfStock && !allowNegativeStock
                            ? "opacity-50 border-dashed border-border bg-muted/30 cursor-not-allowed"
                            : "border-border bg-card hover:border-primary/50 hover:shadow-xs active:scale-[0.99]"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            كود: {p.sku || "بدون"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                          <span className="text-xs font-bold text-primary font-mono">
                            {formatCurrency(p.selling_price)}
                          </span>
                          <Badge
                            variant={isOutOfStock ? "destructive" : p.current_stock <= p.minimum_stock ? "warning" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {p.current_stock}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LEFT: CART & CHECKOUT (5 COLS) */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="border-border shadow-xs flex flex-col h-full">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">سلة المبيعات ({cart.length})</CardTitle>
                </div>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="h-7 text-xs text-danger hover:bg-danger/10">
                    تفريغ السلة
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-3 flex-1 flex flex-col justify-between space-y-3">
                {/* Cart Items List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      السلة فارغة. اضغط على أي منتج لإضافته للبيع.
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-md border border-border/70 bg-background text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-foreground truncate block">{item.product.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {formatCurrency(item.unitPrice)} للوحدة
                          </span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                            className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-bold font-mono px-1.5 text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                            className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Total */}
                        <div className="text-left font-bold font-mono text-foreground w-16">
                          {formatCurrency(item.quantity * item.unitPrice - item.discount)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(idx)}
                          className="p-1 text-muted-foreground hover:text-danger"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Checkout Controls */}
                <div className="border-t border-border pt-3 space-y-2.5">
                  {/* Customer Selection (if enabled) */}
                  {hasCustomers && (
                    <div className="space-y-1 text-right">
                      <label className="text-[11px] font-semibold text-foreground">العميل (اختياري)</label>
                      <Select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="h-8 text-xs"
                      >
                        <option value="">عميل نقدي عام</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.balance > 0 ? `(مديونية: ${c.balance} ج.م)` : ""}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* Payment Type */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 text-right">
                      <label className="text-[11px] font-semibold text-foreground">طريقة الدفع</label>
                      <Select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as any)}
                        className="h-8 text-xs"
                      >
                        <option value="CASH">دفع نقدي (كاش)</option>
                        {hasCustomers && <option value="CREDIT">بيع آجل (على الحساب)</option>}
                        {hasCustomers && <option value="PARTIAL">دفع جزئي (مقدم + آجل)</option>}
                      </Select>
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[11px] font-semibold text-foreground">خصم إجمالي (ج.م)</label>
                      <Input
                        type="number"
                        min="0"
                        value={overallDiscount}
                        onChange={(e) => setOverallDiscount(Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Partial Payment Amount Input */}
                  {paymentType === "PARTIAL" && (
                    <div className="space-y-1 text-right">
                      <label className="text-[11px] font-semibold text-foreground">المبلغ المدفوع الآن (كاش)</label>
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

                  {/* Totals Summary */}
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-xs divide-y divide-border/50">
                    <div className="flex justify-between pb-1">
                      <span className="text-muted-foreground">المجموع الفرعي:</span>
                      <span className="font-mono">{formatCurrency(subtotal)}</span>
                    </div>
                    {overallDiscount > 0 && (
                      <div className="flex justify-between py-1 text-success">
                        <span>الخصم:</span>
                        <span className="font-mono">-{formatCurrency(overallDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1.5 text-base font-bold text-foreground">
                      <span>الإجمالي المطلوب:</span>
                      <span className="font-mono text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                    {paymentType !== "CASH" && (
                      <div className="flex justify-between pt-1 text-danger font-semibold">
                        <span>المتبقي في حساب العميل:</span>
                        <span className="font-mono">{formatCurrency(grandTotal - paidAmount)}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Sale Button */}
                  <Button
                    type="button"
                    onClick={handleConfirmSale}
                    disabled={submitting || cart.length === 0}
                    className="w-full h-10 text-sm font-bold gap-2 shadow-xs"
                  >
                    <Check className="h-4 w-4" />
                    <span>{submitting ? "جاري حفظ الفاتورة..." : `تأكيد البيع (${formatCurrency(grandTotal)})`}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* TAB 2: SALES HISTORY */
        <Card className="border-border shadow-xs">
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل الفواتير...</div>
            ) : salesHistory.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={History}
                  title="لسه مفيش فواتير بيع سابقة"
                  description="ابدأ بإصدار أول فاتورة من شاشة نقطة البيع."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>طريقة الدفع</TableHead>
                    <TableHead className="text-center font-bold">الإجمالي</TableHead>
                    <TableHead className="text-center">المدفوع</TableHead>
                    <TableHead className="text-center">المتبقي</TableHead>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="w-24 text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesHistory.map((s) => (
                    <TableRow key={s.id} className={s.status === 'CANCELLED' ? 'opacity-50 bg-muted/20' : ''}>
                      <TableCell className="font-mono font-bold text-primary text-xs">
                        {s.invoice_number}
                        {s.status === 'CANCELLED' && <Badge variant="destructive" className="mr-2 text-[8px] px-1 py-0 h-4">ملغاة</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.customer_name || "عميل نقدي"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.payment_type === "CASH" ? "success" : s.payment_type === "CREDIT" ? "warning" : "info"}
                          className="text-[10px]"
                        >
                          {s.payment_type === "CASH" ? "نقدي" : s.payment_type === "CREDIT" ? "آجل" : "جزئي"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold font-mono text-sm">
                        {formatCurrency(s.total)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {formatCurrency(s.paid_amount)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-semibold text-danger">
                        {s.remaining_amount > 0 ? formatCurrency(s.remaining_amount) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.user_name || "المسؤول"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {formatDateTime(s.created_at)}
                      </TableCell>
                      <TableCell className="text-center flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => handlePrintReceipt(s.id)}
                          title="طباعة الفاتورة"
                          disabled={s.status === 'CANCELLED'}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-danger hover:bg-danger/10"
                          onClick={() => {
                            setSaleToCancel(s.id);
                            setCancelModalOpen(true);
                          }}
                          title="استرجاع الفاتورة للمخزن"
                          disabled={s.status === 'CANCELLED'}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* SUCCESS MODAL AFTER SALE */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success mb-2">
            <Check className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg text-center">تم تسجيل البيع بنجاح 🎉</DialogTitle>
          <DialogDescription className="text-center text-xs mt-1">
            فاتورة رقم: <span className="font-mono font-bold text-foreground">{lastCreatedSale?.invoice_number}</span>
            <br />
            تم تحديث المخزون وحساب الأرباح وتسجيل القيد المالي آلياً.
          </DialogDescription>

          <DialogFooter className="flex justify-center gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => handlePrintReceipt()}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة إيصال البيع</span>
            </Button>
            <Button onClick={() => setSuccessModalOpen(false)}>
              فاتورة جديدة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANCEL SALE CONFIRMATION MODAL */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-danger flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              تأكيد الاسترجاع
            </DialogTitle>
            <DialogDescription className="text-right mt-2 text-sm leading-relaxed">
              هل أنت متأكد من إلغاء الفاتورة واسترجاع كافة محتوياتها للمخزن؟ 
              <br />
              <span className="font-bold">ملاحظة:</span> سيتم إضافة الكميات للمخزون مرة أخرى، وتعديل حساب العميل (إن وجد). لا يمكن التراجع عن هذه الخطوة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)} disabled={cancelling}>
              تراجع
            </Button>
            <Button variant="destructive" onClick={confirmCancelSale} disabled={cancelling}>
              {cancelling ? "جاري الإلغاء..." : "نعم، استرجاع للمخزن"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
