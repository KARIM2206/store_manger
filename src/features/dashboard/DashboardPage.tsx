// ==========================================================
// src/features/dashboard/DashboardPage.tsx
// لوحة التحكم الرئيسية (Dashboard)
// ==========================================================

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Boxes,
  TrendingUp,
  ShoppingBag,
  Users,
  Truck,
  AlertTriangle,
  PlusCircle,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useFeature } from "@/stores/featureStore";
import { inventoryRepository } from "@/database/repositories/inventoryRepository";
import { salesRepository } from "@/database/repositories/salesRepository";
import { purchaseRepository } from "@/database/repositories/purchaseRepository";
import { customerRepository } from "@/database/repositories/customerRepository";
import { supplierRepository } from "@/database/repositories/supplierRepository";
import { expenseRepository } from "@/database/repositories/expenseRepository";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ProductRow, SaleRow } from "@/types/database";

// Recharts components
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Features check
  const hasPurchases = useFeature("purchases");
  const hasSuppliers = useFeature("suppliers");
  const hasCustomers = useFeature("customers");
  const hasExpenses = useFeature("expenses");
  const hasReports = useFeature("reports");

  const [loading, setLoading] = React.useState(true);

  // KPIs
  const [totalProducts, setTotalProducts] = React.useState(0);
  const [totalStockValue, setTotalStockValue] = React.useState(0);
  const [lowStockProducts, setLowStockProducts] = React.useState<ProductRow[]>([]);
  const [todaySales, setTodaySales] = React.useState(0);
  const [todayProfit, setTodayProfit] = React.useState(0);
  const [todayPurchases, setTodayPurchases] = React.useState(0);
  const [customersCount, setCustomersCount] = React.useState(0);
  const [suppliersCount, setSuppliersCount] = React.useState(0);

  // Charts & Tables data
  const [sevenDaysSales, setSevenDaysSales] = React.useState<{ day: string; sales: number }[]>([]);
  const [topProducts, setTopProducts] = React.useState<{ name: string; quantity: number }[]>([]);
  const [recentSales, setRecentSales] = React.useState<SaleRow[]>([]);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. Inventory stats
        const inv = await inventoryRepository.getInventoryStatus();
        setTotalProducts(inv.totalProducts);
        setTotalStockValue(inv.totalStockValue);
        setLowStockProducts(inv.items.filter((i) => i.status === "منخفض" || i.status === "نفد"));

        // 2. Sales stats
        const salesStats = await salesRepository.getDailySalesStats();
        setTodaySales(salesStats.todaySales);

        // Calculate profit minus expenses if expenses feature enabled
        let netProfit = salesStats.todayProfit;
        if (hasExpenses) {
          const todayStr = new Date().toISOString().split("T")[0];
          const todayExpenses = await expenseRepository.getTotalExpenses(todayStr, todayStr);
          netProfit = Math.max(0, netProfit - todayExpenses);
        }
        setTodayProfit(netProfit);

        // 3. Last 7 days sales
        const last7 = await salesRepository.getLastSevenDaysSales();
        setSevenDaysSales(last7.map((d) => ({ day: d.day, sales: d.sales })));

        // 4. Top selling products
        const tops = await salesRepository.getTopSellingProducts(5);
        setTopProducts(tops);

        // 5. Recent sales table
        const recent = await salesRepository.getAll(5);
        setRecentSales(recent);

        // 6. Purchases if enabled
        if (hasPurchases) {
          const pToday = await purchaseRepository.getTodayPurchasesTotal();
          setTodayPurchases(pToday);
        }

        // 7. Customers if enabled
        if (hasCustomers) {
          const custs = await customerRepository.getAll();
          setCustomersCount(custs.length);
        }

        // 8. Suppliers if enabled
        if (hasSuppliers) {
          const sups = await supplierRepository.getAll();
          setSuppliersCount(sups.length);
        }
      } catch (err) {
        console.error("خطأ أثناء تحميل بيانات لوحة التحكم:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [hasPurchases, hasSuppliers, hasCustomers, hasExpenses]);

  const todayArabicDate = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6 select-none" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            صباح الخير، يا {user?.full_name || "المدير"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            دي نظرة سريعة على حالة المخزن النهارده • {todayArabicDate}
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => navigate("/sales")} className="gap-1.5 shadow-xs" size="sm">
            <ShoppingCart className="h-4 w-4" />
            <span>تسجيل بيع</span>
          </Button>
          <Button
            onClick={() => navigate("/products?action=add")}
            variant="outline"
            className="gap-1.5 shadow-xs"
            size="sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>إضافة منتج</span>
          </Button>
          {hasPurchases && (
            <Button
              onClick={() => navigate("/purchases?action=add")}
              variant="outline"
              className="gap-1.5 shadow-xs"
              size="sm"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>تسجيل شراء</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Products */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              إجمالي المنتجات
            </CardTitle>
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : totalProducts.toLocaleString("ar-EG")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">صنف مسجل بالمخزن</p>
          </CardContent>
        </Card>

        {/* 2. Total Stock Value */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              قيمة المخزون
            </CardTitle>
            <div className="p-2 rounded-md bg-info/10 text-info">
              <Boxes className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : formatCurrency(totalStockValue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">بسعر الشراء والتكلفة</p>
          </CardContent>
        </Card>

        {/* 3. Today Sales */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              مبيعات اليوم
            </CardTitle>
            <div className="p-2 rounded-md bg-success/10 text-success">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : formatCurrency(todaySales)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">إجمالي الفواتير المحصلة</p>
          </CardContent>
        </Card>

        {/* 4. Low Stock Alert */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              المنتجات الناقصة
            </CardTitle>
            <div className="p-2 rounded-md bg-warning/10 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {loading ? "..." : lowStockProducts.length.toLocaleString("ar-EG")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">وصلت للحد الأدنى أو نفدت</p>
          </CardContent>
        </Card>

        {/* Optional KPI: Purchases */}
        {hasPurchases && (
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                مشتريات اليوم
              </CardTitle>
              <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? "..." : formatCurrency(todayPurchases)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">فواتير التوريد لليوم</p>
            </CardContent>
          </Card>
        )}

        {/* Optional KPI: Profit (if reports enabled) */}
        {hasReports && (
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                صافي الربح التقديري
              </CardTitle>
              <div className="p-2 rounded-md bg-success/10 text-success">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {loading ? "..." : formatCurrency(todayProfit)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">بعد خصم التكلفة والمصروفات</p>
            </CardContent>
          </Card>
        )}

        {/* Optional KPI: Customers */}
        {hasCustomers && (
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                عدد العملاء
              </CardTitle>
              <div className="p-2 rounded-md bg-info/10 text-info">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? "..." : customersCount.toLocaleString("ar-EG")}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">عميل مسجل في قاعدة البيانات</p>
            </CardContent>
          </Card>
        )}

        {/* Optional KPI: Suppliers */}
        {hasSuppliers && (
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground">
                عدد الموردين
              </CardTitle>
              <div className="p-2 rounded-md bg-secondary text-secondary-foreground">
                <Truck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? "..." : suppliersCount.toLocaleString("ar-EG")}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">شركات ومؤسسات التوريد</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Chart (2 cols) */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">المبيعات خلال آخر 7 أيام</CardTitle>
          </CardHeader>
          <CardContent className="h-64 min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sevenDaysSales} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `${val} ج.م`}
                />
                <RechartsTooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString("ar-EG")} ج.م`, "المبيعات"]}
                  labelStyle={{ textAlign: "right" }}
                  contentStyle={{
                    direction: "rtl",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                  }}
                />
                <Bar dataKey="sales" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Selling Products (1 col) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">أكثر المنتجات مبيعًا</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                سجل أول عمليات بيع لتظهر المنتجات الأكثر طلباً.
              </p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-foreground truncate max-w-[150px]">
                      {p.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {p.quantity} مبيعة
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Sales */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">آخر عمليات البيع</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/sales")} className="text-xs gap-1">
              <span>عرض الكل</span>
              <ArrowUpRight className="h-3.5 w-3.5 rotate-180" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                لسه مفيش عمليات بيع مسجلة.
              </div>
            ) : (
              <div className="space-y-2">
                {recentSales.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-md border border-border/70 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {s.invoice_number}
                        </span>
                        {s.payment_type === "CREDIT" && (
                          <Badge variant="warning" className="text-[10px]">
                            آجل
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {s.customer_name ? `العميل: ${s.customer_name}` : "عميل نقدي"} • {formatDate(s.created_at)}
                      </p>
                    </div>
                    <div className="text-left font-bold text-sm text-foreground">
                      {formatCurrency(s.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts Table */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>المنتجات اللي قربت تخلص</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/inventory")} className="text-xs gap-1">
              <span>إدارة المخزون</span>
              <ArrowUpRight className="h-3.5 w-3.5 rotate-180" />
            </Button>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                المخزون في حالة ممتازة! مفيش منتجات تحت الحد الأدنى.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-md border border-border/70 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-xs text-foreground">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        الحد الأدنى: {p.minimum_stock}
                      </p>
                    </div>
                    <div className="text-left">
                      <Badge
                        variant={p.current_stock <= 0 ? "destructive" : "warning"}
                        className="text-xs font-bold"
                      >
                        {p.current_stock <= 0 ? "نفد" : `${p.current_stock} متبقي`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
