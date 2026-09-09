// ==========================================================
// src/features/auth/LoginPage.tsx
// شاشة تسجيل الدخول
// ==========================================================

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, User, AlertCircle, Sparkles } from "lucide-react";

export function LoginPage() {
  const [username, setUsername] = React.useState("admin");
  const [password, setPassword] = React.useState("Admin@123");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 select-none" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white text-xl font-bold mb-2 shadow-xs">
            م
          </div>
          <h1 className="text-2xl font-bold text-foreground">مدير المخزن</h1>
          <p className="text-sm text-muted-foreground">نظام متكامل لإدارة المخزون والمبيعات والمشتريات</p>
        </div>

        <Card className="border-border shadow-md">
          <CardHeader className="space-y-1 text-right">
            <CardTitle className="text-lg">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل اسم المستخدم وكلمة المرور للمتابعة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-danger/10 p-3 text-sm text-danger text-right">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 justify-start">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>اسم المستخدم</span>
                </label>
                <Input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: admin"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 justify-start">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>كلمة المرور</span>
                </label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>
            </form>

            {/* Development demo credentials box */}
            <div className="mt-5 rounded-md border border-info/30 bg-info/5 p-3 text-right">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-info mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>بيانات تجريبية للتطوير (Demo):</span>
              </div>
              <p className="text-xs text-muted-foreground">
                المستخدم: <code className="font-mono text-foreground font-bold">admin</code> | كلمة المرور:{" "}
                <code className="font-mono text-foreground font-bold">Admin@123</code>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          يعمل محلياً بدون اتصال بالإنترنت • قاعدة بيانات SQLite آمنة
        </p>
      </div>
    </div>
  );
}
