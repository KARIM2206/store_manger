// ==========================================================
// src/features/activity/ActivityLogPage.tsx
// موديول سجل النشاط ومراقبة العمليات الحساسة
// ==========================================================

import * as React from "react";
import { History, Shield, Search } from "lucide-react";
import { activityLogRepository } from "@/database/repositories/activityLogRepository";
import { ActivityLogRow } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export function ActivityLogPage() {
  const [logs, setLogs] = React.useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await activityLogRepository.getAll(100);
      setLogs(data);
    } catch (e) {
      console.error("فشل تحميل سجل النشاط:", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadLogs();
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN":
        return <Badge variant="info">تسجيل دخول</Badge>;
      case "LOGOUT":
        return <Badge variant="secondary">تسجيل خروج</Badge>;
      case "CREATE_SALE":
        return <Badge variant="success">فاتورة بيع</Badge>;
      case "CREATE_PURCHASE":
        return <Badge variant="default">فاتورة شراء</Badge>;
      case "CREATE_PRODUCT":
      case "UPDATE_PRODUCT":
        return <Badge variant="secondary">المنتجات</Badge>;
      case "DELETE_PRODUCT":
        return <Badge variant="destructive">حذف منتج</Badge>;
      case "BACKUP":
        return <Badge variant="warning">نسخ احتياطي</Badge>;
      case "RESTORE":
        return <Badge variant="destructive">استرجاع بيانات</Badge>;
      case "CUSTOMER_PAYMENT":
      case "SUPPLIER_PAYMENT":
        return <Badge variant="success">سند مالي</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const filtered = logs.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      l.description.toLowerCase().includes(q) ||
      (l.user_name && l.user_name.toLowerCase().includes(q)) ||
      l.action.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">سجل النشاط</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تتبع العمليات الحساسة والتعديلات والمبيعات في النظام لحماية الأمان.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في السجل أو بالمستخدم..."
            className="pr-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل السجل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={History}
                title="سجل النشاط فارغ"
                description="كل عملية دخول أو إضافة منتج أو بيع أو تعديل إعدادات ستظهر هنا."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead className="text-center">العملية</TableHead>
                  <TableHead>تفاصيل الحدث</TableHead>
                  <TableHead>التاريخ والوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log, idx) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {log.user_name || "النظام"}
                    </TableCell>
                    <TableCell className="text-center">
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {log.description}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
