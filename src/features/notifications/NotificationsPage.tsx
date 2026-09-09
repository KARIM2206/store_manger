// ==========================================================
// src/features/notifications/NotificationsPage.tsx
// موديول الإشعارات والتنبيهات
// ==========================================================

import * as React from "react";
import { Bell, Check, AlertTriangle, AlertCircle, Info, Database } from "lucide-react";
import { notificationRepository } from "@/database/repositories/notificationRepository";
import { NotificationRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";

export function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationRepository.getAll(50);
      setNotifications(data);
    } catch (e) {
      console.error("فشل تحميل الإشعارات:", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    await notificationRepository.markAllAsRead();
    await loadNotifications();
  };

  const handleMarkRead = async (id: string) => {
    await notificationRepository.markAsRead(id);
    await loadNotifications();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "OUT_OF_STOCK":
        return <AlertCircle className="h-4 w-4 text-danger" />;
      case "BACKUP":
        return <Database className="h-4 w-4 text-info" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإشعارات والتنبيهات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تنبيهات نقص المخزون والعمليات المهمة في النظام.
          </p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <Button onClick={handleMarkAllRead} variant="outline" size="sm" className="gap-1.5 shadow-xs">
            <Check className="h-4 w-4" />
            <span>تحديد الكل كمقروء</span>
          </Button>
        )}
      </div>

      {/* List */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل الإشعارات...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Bell}
                title="مفيش إشعارات حالياً"
                description="كل شيء يعمل بسلاسة، ستظهر التنبيهات هنا فور حدوث أي نقص في المخزون أو عملية هامة."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between p-4 transition-colors ${
                    n.is_read ? "bg-card" : "bg-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-muted mt-0.5">{getIcon(n.type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{n.title}</span>
                        {!n.is_read && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            جديد
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                      <span className="text-[10px] font-mono text-muted-foreground mt-2 block">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                  </div>

                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      مقروء
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
