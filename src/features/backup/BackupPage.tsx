// ==========================================================
// src/features/backup/BackupPage.tsx
// موديول النسخ الاحتياطي واسترجاع قاعدة بيانات SQLite
// ==========================================================

import * as React from "react";
import {
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Folder,
} from "lucide-react";
import { backupService } from "@/services/backupService";
import { useAuthStore } from "@/stores/authStore";
import { BackupRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export function BackupPage() {
  const { user } = useAuthStore();
  const [backups, setBackups] = React.useState<BackupRow[]>([]);
  const [appDir, setAppDir] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [backupLoading, setBackupLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Restore State
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
  const [selectedBackupPath, setSelectedBackupPath] = React.useState<string>("");
  const [restoreConfirmOpen, setRestoreConfirmOpen] = React.useState(false);
  const [restoreLoading, setRestoreLoading] = React.useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await backupService.listBackups();
      const dir = await backupService.getAppDir();
      setBackups(list);
      setAppDir(dir);
    } catch (e) {
      console.error("فشل تحميل بيانات النسخ الاحتياطي:", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setSuccessMessage(null);
    try {
      const path = await backupService.createBackup(user?.id || "user-admin");
      setSuccessMessage(`تم إنشاء النسخة الاحتياطية بنجاح في: ${path}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "حدث خطأ أثناء إنشاء النسخة الاحتياطية");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleStartRestore = (filePath: string) => {
    setSelectedBackupPath(filePath);
    setRestoreConfirmOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupPath) return;
    setRestoreLoading(true);
    try {
      const msg = await backupService.restoreBackup(user?.id || "user-admin", selectedBackupPath);
      alert(msg);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "حدث خطأ أثناء استرجاع النسخة الاحتياطية");
    } finally {
      setRestoreLoading(false);
      setRestoreConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">النسخ الاحتياطي واسترجاع البيانات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            حفظ نسخ دورية من قاعدة بيانات SQLite واسترجاعها بأمان كامل مع نسخ الحماية التلقائي.
          </p>
        </div>

        <Button
          onClick={handleCreateBackup}
          disabled={backupLoading}
          size="sm"
          className="gap-1.5 shadow-xs"
        >
          <Download className="h-4 w-4" />
          <span>{backupLoading ? "جاري إنشاء النسخة..." : "إنشاء نسخة احتياطية الآن"}</span>
        </Button>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-md bg-success/10 border border-success/30 p-3 text-xs text-success text-right">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-primary">
              <Folder className="h-4 w-4" />
              <CardTitle className="text-xs font-semibold">مجلد حفظ البيانات والنسخ</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xs text-foreground bg-muted/50 p-2 rounded border border-border/70 break-all select-all">
              {appDir || "AppData/Local/com.storemanager.app/"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              يتم حفظ قاعدة البيانات والنسخ التلقائية في مسار بيانات المستخدم لضمان سلامة الصلاحيات.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-warning">
              <ShieldCheck className="h-4 w-4" />
              <CardTitle className="text-xs font-semibold">نسخ الأمان التلقائي (Safety Backup)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-foreground font-medium">
              محمي بنظام الأمان الثلاثي
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              قبل أي عملية استرجاع لأي نسخة قديمة، يقوم النظام آلياً بحفظ نسخة أمان لحظية من الحالة الراهنة لتفادي أي فقدان غير مقصود للبيانات.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Backups History Table */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">سجل النسخ الاحتياطية السابقة</CardTitle>
          <CardDescription>قائمة بالنسخ المحفوظة على هذا الجهاز</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">جاري فحص النسخ...</div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              لا توجد نسخ احتياطية مسجلة بعد. اضغط "إنشاء نسخة احتياطية الآن" لحفظ أول نسخة.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>اسم ملف النسخة</TableHead>
                  <TableHead>المسار</TableHead>
                  <TableHead className="text-center">النوع</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead className="w-28 text-center">استرجاع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b, idx) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {b.filename}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-xs">
                      {b.filepath}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px]">
                        {b.backup_type === "MANUAL" ? "يدوي" : "تلقائي"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDateTime(b.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-warning border-warning/30 hover:bg-warning/10 gap-1"
                        onClick={() => handleStartRestore(b.filepath)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>استرجاع</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* STRONG WARNING RESTORE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={restoreConfirmOpen}
        onOpenChange={setRestoreConfirmOpen}
        title="⚠️ تحذير أمان هام: استرجاع النسخة الاحتياطية"
        description="استرجاع النسخة الاحتياطية هيستبدل البيانات الحالية ببيانات الملف المحدد. تأكد إنك عامل نسخة احتياطية حديثة قبل الاستمرار. سيقوم النظام بإنشاء نسخة أمان تلقائية قبل التنفيذ."
        confirmText={restoreLoading ? "جاري الاسترجاع..." : "أنا متأكد، استرجع النسخة الآن"}
        cancelText="إلغاء والتراجع"
        onConfirm={handleConfirmRestore}
        variant="danger"
        loading={restoreLoading}
      />
    </div>
  );
}
