// ==========================================================
// src/features/reports/ReportsPage.tsx
// موديول التقارير المالية والأرباح والمخزون مع التصدير والطباعة
// ==========================================================

import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Boxes,
  Download,
  Printer,
  Calendar,
  Filter,
} from "lucide-react";
import { salesRepository } from "@/database/repositories/salesRepository";
import { purchaseRepository } from "@/database/repositories/purchaseRepository";
import { inventoryRepository } from "@/database/repositories/inventoryRepository";
import { expenseRepository } from "@/database/repositories/expenseRepository";
import { getDatabase } from "@/database/connection";
import { useFeature } from "@/stores/featureStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ReportsPage() {
  const hasPurchases = useFeature("purchases");
  const hasExpenses = useFeature("expenses");

  const [activeTab, setActiveTab] = React.useState("profit");
  const [loading, setLoading] = React.useState(true);

  // Profit Metrics
  const [totalSales, setTotalSales] = React.useState(0);
  const [cogs, setCogs] = React.useState(0);
  const [grossProfit, setGrossProfit] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [netProfit, setNetProfit] = React.useState(0);

  // Product Sales Report
  const [productSales, setProductSales] = React.useState<
    { name: string; quantity: number; revenue: number; cost: number; profit: number }[]
  >([]);

  // Inventory Report
  const [inventoryItems, setInventoryItems] = React.useState<any[]>([]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const db = await getDatabase();

      // 1. Calculate Sales and COGS from sale_items
      const saleItems = await db.select<
        { quantity: number; unit_price: number; purchase_cost: number; total: number }[]
      >(`SELECT * FROM sale_items`);

      let salesSum = 0;
      let costSum = 0;

      for (const item of saleItems) {
        salesSum += Number(item.total);
        costSum += Number(item.purchase_cost) * Number(item.quantity);
      }

      setTotalSales(salesSum);
      setCogs(costSum);
      const gross = Math.max(0, salesSum - costSum);
      setGrossProfit(gross);

      // 2. Expenses
      let expSum = 0;
      if (hasExpenses) {
        expSum = await expenseRepository.getTotalExpenses();
        setTotalExpenses(expSum);
      }
      setNetProfit(gross - expSum);

      // 3. Product Sales Performance
      const prodRows = await db.select<any[]>(
        `SELECT p.name, 
          SUM(si.quantity) as qty, 
          SUM(si.total) as rev, 
          SUM(si.purchase_cost * si.quantity) as cost 
         FROM sale_items si 
         JOIN products p ON si.product_id = p.id 
         GROUP BY p.id, p.name 
         ORDER BY rev DESC`
      );

      setProductSales(
        prodRows.map((r) => {
          const rev = Number(r.rev || 0);
          const c = Number(r.cost || 0);
          return {
            name: r.name,
            quantity: Number(r.qty || 0),
            revenue: rev,
            cost: c,
            profit: rev - c,
          };
        })
      );

      // 4. Inventory stats
      const inv = await inventoryRepository.getInventoryStatus();
      setInventoryItems(inv.items);
    } catch (err) {
      console.error("فشل إعداد التقارير:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadReports();
  }, [hasExpenses, hasPurchases]);

  const handlePrint = () => {
    window.print();
  };

  const exportProductReport = () => {
    if (productSales.length === 0) return;
    const headers = ["المنتج", "الكمية المباعة", "إجمالي المبيعات", "تكلفة البضاعة", "الربح"];
    const rows = productSales.map((p) => [
      `"${p.name}"`,
      p.quantity,
      p.revenue,
      p.cost,
      p.profit,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_performance_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير المالية والأرباح</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تحليل دقيق لإجمالي المبيعات، تكلفة البضاعة، المصروفات، وصافي الأرباح.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={exportProductReport} variant="outline" size="sm" className="gap-1.5 shadow-xs">
            <Download className="h-4 w-4" />
            <span>تصدير CSV</span>
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5 shadow-xs">
            <Printer className="h-4 w-4" />
            <span>طباعة التقرير</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted mb-4">
          <TabsTrigger value="profit" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            <span>تقرير الأرباح والمصروفات</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span>مبيعات المنتجات</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5">
            <Boxes className="h-4 w-4" />
            <span>حالة المخزون وركوده</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PROFIT & LOSS */}
        <TabsContent value="profit" className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sales */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  إجمالي المبيعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono text-primary">
                  {formatCurrency(totalSales)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">قيمة البضاعة المباعة</p>
              </CardContent>
            </Card>

            {/* COGS */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  تكلفة البضاعة المباعة (COGS)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono text-muted-foreground">
                  {formatCurrency(cogs)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">تكلفة الشراء الفعلية</p>
              </CardContent>
            </Card>

            {/* Expenses */}
            {hasExpenses && (
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    المصروفات التشغيلية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono text-danger">
                    {formatCurrency(totalExpenses)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">إيجار، كهرباء، مرتبات...</p>
                </CardContent>
              </Card>
            )}

            {/* Net Profit */}
            <Card className="border-border border-success/30 bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-success">
                  صافي الربح النهائي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold font-mono text-success">
                  {formatCurrency(netProfit)}
                </div>
                <p className="text-[11px] text-success/80 mt-0.5">المبيعات - التكلفة - المصروفات</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Calculation Card */}
          <Card className="border-border shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm">معادلة حساب الأرباح الدقيقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-right divide-y divide-border">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">إجمالي مبيعات الفواتير:</span>
                <span className="font-mono font-bold text-foreground">{formatCurrency(totalSales)}</span>
              </div>
              <div className="flex justify-between py-2 text-danger">
                <span>(-) تكلفة البضاعة المباعة بسعر الشراء:</span>
                <span className="font-mono font-bold">-{formatCurrency(cogs)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm bg-muted/20 px-2 rounded">
                <span>(=) مجمل الربح التجاري (Gross Profit):</span>
                <span className="font-mono text-primary">{formatCurrency(grossProfit)}</span>
              </div>
              {hasExpenses && (
                <div className="flex justify-between py-2 text-danger">
                  <span>(-) إجمالي المصروفات العامة والتشغيلية:</span>
                  <span className="font-mono font-bold">-{formatCurrency(totalExpenses)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 font-bold text-base text-success bg-success/10 px-3 rounded-md">
                <span>(=) صافي الربح الحقيقي للنشاط (Net Profit):</span>
                <span className="font-mono">{formatCurrency(netProfit)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PRODUCT SALES PERFORMANCE */}
        <TabsContent value="products">
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              {productSales.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  لا توجد مبيعات مسجلة حتى الآن لحساب أداء المنتجات.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>اسم المنتج</TableHead>
                      <TableHead className="text-center font-bold">الكمية المباعة</TableHead>
                      <TableHead className="text-center">إجمالي المبيعات</TableHead>
                      <TableHead className="text-center">التكلفة التقديرية</TableHead>
                      <TableHead className="text-center font-bold">الربح المحقق</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSales.map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center text-xs font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-sm">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-sm">
                          {p.quantity}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {formatCurrency(p.revenue)}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {formatCurrency(p.cost)}
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-sm text-success">
                          {formatCurrency(p.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: INVENTORY REPORT */}
        <TabsContent value="inventory">
          <Card className="border-border shadow-xs">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead className="text-center">الرصيد بالمخزن</TableHead>
                    <TableHead className="text-center">سعر التكلفة</TableHead>
                    <TableHead className="text-center font-bold">إجمالي القيمة التخزينية</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold text-sm">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {item.category_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-sm">
                        {item.current_stock} {item.unit_symbol}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {formatCurrency(item.purchase_price)}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-sm text-primary">
                        {formatCurrency(item.current_stock * item.purchase_price)}
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
                          className="text-[11px]"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
