// ==========================================================
// src/features/users/UsersPage.tsx
// موديول إدارة المستخدمين وصلاحيات الأدوار
// ==========================================================

import * as React from "react";
import { UserCheck, Plus, Edit2, Trash2, Shield, AlertCircle } from "lucide-react";
import { userRepository, UserWithRoleDTO } from "@/database/repositories/userRepository";
import { RoleRow, PermissionRow } from "@/types/database";
import { hashPassword } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = React.useState<UserWithRoleDTO[]>([]);
  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [permissions, setPermissions] = React.useState<PermissionRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Create / Edit Dialog
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserWithRoleDTO | null>(null);
  const [fullName, setFullName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = React.useState<UserWithRoleDTO | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const userList = await userRepository.getAll();
      const roleList = await userRepository.getRoles();
      const permList = await userRepository.getPermissions();

      setUsers(userList);
      setRoles(roleList);
      setPermissions(permList);

      if (roleList.length > 0 && !roleId) {
        setRoleId(roleList[0].id);
      }
    } catch (err) {
      console.error("فشل تحميل المستخدمين والصلاحيات:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const openCreateDialog = () => {
    setEditingUser(null);
    setFullName("");
    setUsername("");
    setPassword("");
    setRoleId(roles.length > 0 ? roles[1]?.id || roles[0].id : "");
    setPhone("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEditDialog = (u: UserWithRoleDTO) => {
    setEditingUser(u);
    setFullName(u.full_name);
    setUsername(u.username);
    setPassword(""); // Leave blank if unchanged
    setRoleId(u.role_id);
    setPhone(u.phone || "");
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !username.trim()) {
      setFormError("الاسم الكامل واسم المستخدم مطلوبان");
      return;
    }

    if (!editingUser && !password) {
      setFormError("كلمة المرور مطلوبة للمستخدم الجديد");
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        const updateData: any = {
          full_name: fullName.trim(),
          role_id: roleId,
          phone: phone.trim() || null,
        };
        if (password) {
          updateData.password_hash = await hashPassword(password);
        }
        await userRepository.update(editingUser.id, updateData);
      } else {
        const passwordHash = await hashPassword(password);
        await userRepository.create({
          full_name: fullName.trim(),
          username: username.trim(),
          password_hash: passwordHash,
          role_id: roleId,
          phone: phone.trim() || null,
          is_active: 1,
        });
      }

      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "حدث خطأ أثناء حفظ بيانات المستخدم");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === currentUser?.id) {
      alert("لا يمكن حذف الحساب الحالي المسجل به الدخول!");
      return;
    }
    try {
      await userRepository.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "تعذر حذف المستخدم");
    }
  };

  return (
    <div className="page-container space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المستخدمين والصلاحيات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إدارة حسابات الموظفين (كاشير، أمين مخزن، مبيعات) وتحديد الصلاحيات الدقيقة.
          </p>
        </div>

        <Button onClick={openCreateDialog} size="sm" className="gap-1.5 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>إضافة موظف / مستخدم</span>
        </Button>
      </div>

      {/* Users Table */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">جاري تحميل المستخدمين...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>الاسم الكامل</TableHead>
                  <TableHead>اسم المستخدم</TableHead>
                  <TableHead>الدور الوظيفي</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead className="w-24 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, idx) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-center text-xs font-mono text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-sm">
                      {u.full_name}
                      {u.id === currentUser?.id && (
                        <span className="mr-2 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-normal">
                          (حسابك الحالي)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {u.username}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role_id === "role-manager" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        <Shield className="h-3 w-3 ml-1" />
                        {u.role_name_ar || u.role_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.phone || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={u.is_active ? "success" : "outline"} className="text-[11px]">
                        {u.is_active ? "نشط" : "معطل"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-warning hover:bg-warning/10"
                          onClick={() => openEditDialog(u)}
                          title="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-danger hover:bg-danger/10"
                            onClick={() => setDeleteTarget(u)}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
            <DialogTitle>{editingUser ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "قم بتعديل الدور أو تغيير كلمة المرور." : "أدخل بيانات الدخول للموظف."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-md bg-danger/10 p-2.5 text-xs text-danger text-right">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">الاسم الكامل *</label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: محمود علي"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">اسم المستخدم للتسجيل *</label>
              <Input
                required
                disabled={!!editingUser}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: mahmoud_cashier"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">الدور والصلاحيات *</label>
              <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name_ar} ({r.name})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">
                {editingUser ? "كلمة المرور الجديدة (اتركها فارغة إذا لم ترغب في تغييرها)" : "كلمة المرور *"}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-foreground">رقم الهاتف</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010xxxxxxxx"
              />
            </div>

            <DialogFooter className="flex justify-start gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : editingUser ? "حفظ التعديل" : "إضافة المستخدم"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف المستخدم"
        description={`إنت متأكد إنك عايز تحذف المستخدم "${deleteTarget?.full_name}" (${deleteTarget?.username})؟`}
        confirmText="تأكيد الحذف"
        cancelText="إلغاء"
        onConfirm={handleDeleteConfirm}
        variant="danger"
      />
    </div>
  );
}
