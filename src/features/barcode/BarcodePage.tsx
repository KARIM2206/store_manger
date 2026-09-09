// ==========================================================
// src/features/barcode/BarcodePage.tsx
// موديول توليد وطباعة ملصقات الباركود للمنتجات
// ==========================================================

import * as React from "react";
import { Barcode as BarcodeIcon, Printer, Search, RefreshCw } from "lucide-react";
import { productRepository } from "@/database/repositories/productRepository";
import { ProductRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";

export function BarcodePage() {
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState<ProductRow | null>(null);
  const [labelsCount, setLabelsCount] = React.useState(12);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productRepository.getAll();
      setProducts(data);
      if (data.length > 0 && !selectedProduct) {
        setSelectedProduct(data[0]);
      }
    } catch (e) {
      console.error("فشل تحميل المنتجات:", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadProducts();
  }, []);

  const handleGenerateBarcode = async (p: ProductRow) => {
    const randomBarcode = `622${Date.now().toString().slice(-9)}`;
    try {
      const updated = await productRepository.update(p.id, { barcode: randomBarcode });
      setProducts((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
      if (selectedProduct?.id === p.id) {
        setSelectedProduct(updated);
      }
    } catch (err: any) {
      alert(err?.message || "تعذر توليد الباركود");
    }
  };

  const handlePrintLabels = () => {
    if (!selectedProduct || !selectedProduct.barcode) return;

    const printWin = window.open("", "_blank", "width=800,height=600");
    if (!printWin) {
      alert("يرجى السماح بالنوافذ المنبثقة لطباعة الباركود");
      return;
    }

    const labelsHtml = Array.from({ length: labelsCount })
      .map(
        () => `
        <div class="label-card">
          <div class="prod-name">${selectedProduct.name}</div>
          <div class="barcode-box">
            <div class="bars">||| | | || ||| || ||| | |||</div>
            <div class="barcode-num">${selectedProduct.barcode}</div>
          </div>
          <div class="price">${formatCurrency(selectedProduct.selling_price)}</div>
        </div>
      `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>طباعة ملصقات باركود - ${selectedProduct.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 15px;
              direction: rtl;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
            }
            .label-card {
              border: 1px dashed #777;
              padding: 10px;
              text-align: center;
              border-radius: 6px;
              page-break-inside: avoid;
            }
            .prod-name {
              font-size: 11px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 4px;
            }
            .bars {
              font-family: 'Courier New', monospace;
              font-size: 22px;
              letter-spacing: 2px;
              line-height: 1;
              font-weight: bold;
            }
            .barcode-num {
              font-family: monospace;
              font-size: 11px;
              margin-top: 3px;
            }
            .price {
              font-size: 13px;
              font-weight: bold;
              color: #000;
              margin-top: 4px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${labelsHtml}
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

    printWin.document.write(html);
    printWin.document.close();
  };

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q))
    );
  });

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الباركود والملصقات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            توليد وطباعة ملصقات الباركود للأصناف لتسريع البيع بقارئ الباركود (Scanner).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* RIGHT: PRODUCTS TABLE (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج لعرض أو توليد الباركود..."
              className="pr-9 h-9 text-xs"
            />
          </div>

          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">جاري تحميل الأصناف...</div>
              ) : filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={BarcodeIcon}
                    title="لا توجد أصناف مطابقة"
                    description="تأكد من كتابة اسم الصنف بدقة."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الباركود الحالي</TableHead>
                      <TableHead className="w-28 text-center">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow
                        key={p.id}
                        className={`cursor-pointer ${
                          selectedProduct?.id === p.id ? "bg-primary/5" : ""
                        }`}
                        onClick={() => setSelectedProduct(p)}
                      >
                        <TableCell>
                          <span className="font-semibold text-xs block">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">كود: {p.sku || "—"}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.barcode ? (
                            <span className="inline-flex items-center gap-1 font-bold text-foreground">
                              <BarcodeIcon className="h-3.5 w-3.5 text-primary" />
                              {p.barcode}
                            </span>
                          ) : (
                            <span className="text-warning text-[11px]">بدون باركود</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateBarcode(p);
                            }}
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>توليد</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LEFT: LABEL PREVIEW & PRINT (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm">معاينة وطباعة الملصق</CardTitle>
              <CardDescription>
                {selectedProduct ? selectedProduct.name : "اختر منتجاً للمعاينة"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProduct ? (
                <>
                  {/* Label Card Visual Simulation */}
                  <div className="mx-auto w-64 rounded-lg border-2 border-dashed border-border p-4 text-center bg-card shadow-xs space-y-2">
                    <p className="font-bold text-xs text-foreground truncate">
                      {selectedProduct.name}
                    </p>
                    {selectedProduct.barcode ? (
                      <div className="py-2 bg-muted/40 rounded border border-border/50">
                        <div className="font-mono font-bold text-2xl tracking-widest text-foreground select-all">
                          ||| | | || ||| || |||
                        </div>
                        <p className="font-mono text-xs text-muted-foreground mt-1">
                          {selectedProduct.barcode}
                        </p>
                      </div>
                    ) : (
                      <div className="py-4 text-xs text-warning bg-warning/10 rounded">
                        لا يوجد باركود لهذا الصنف. اضغط "توليد" بالجدول.
                      </div>
                    )}
                    <p className="font-bold text-base text-primary font-mono">
                      {formatCurrency(selectedProduct.selling_price)}
                    </p>
                  </div>

                  {/* Print Options */}
                  {selectedProduct.barcode && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="space-y-1 text-right">
                        <label className="text-xs font-semibold text-foreground">
                          عدد الملصقات المطلوب طباعتها
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={labelsCount}
                          onChange={(e) => setLabelsCount(Number(e.target.value))}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <Button
                        onClick={handlePrintLabels}
                        className="w-full gap-2 shadow-xs"
                      >
                        <Printer className="h-4 w-4" />
                        <span>طباعة الملصقات ({labelsCount} ملصق)</span>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  اختر منتجاً من الجدول لعرض الملصق.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
