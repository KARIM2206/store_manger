// ==========================================================
// src/features/setup/SetupWizard.tsx
// معالج الإعداد الأول للنظام (Setup Wizard)
// ==========================================================

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { settingsRepository } from "@/database/repositories/settingsRepository";
import { useAuthStore } from "@/stores/authStore";
import { useFeatureStore } from "@/stores/featureStore";
import { CheckCircle2, Store, Sliders, ShieldCheck, ArrowLeft, ArrowRight } from "lucide-react";

export function SetupWizard() {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Step 2: Store Info
  const [storeName, setStoreName] = React.useState("مخزن الأمل للتشطيبات والسيراميك");
  const [businessType, setBusinessType] = React.useState("تجارة سيراميك وبورسلين وأدوات صحية");
  const [phone, setPhone] = React.useState("01001234567");
  const [address, setAddress] = React.useState("القاهرة، مصر");
  const [currency, setCurrency] = React.useState("ج.م");

  // Step 3: Features
  const [features, setFeatures] = React.useState<Record<string, boolean>>({
    purchases: true,
    suppliers: true,
    customers: true,
    expenses: true,
    barcode: true,
    reports: true,
    users: true,
    activity_log: true,
    notifications: true,
  });

  // Step 4: Admin Account
  const [fullName, setFullName] = React.useState("مدير النظام");
  const [username, setUsername] = React.useState("admin");
  const [password, setPassword] = React.useState("Admin@123");
  const [confirmPassword, setConfirmPassword] = React.useState("Admin@123");
  const [adminPhone, setAdminPhone] = React.useState("01001234567");

  const { setUser } = useAuthStore();
  const { loadFeatures } = useFeatureStore();
  const navigate = useNavigate();

  const handleToggleFeature = (id: string, checked: boolean) => {
    setFeatures((prev) => ({ ...prev, [id]: checked }));
  };

  const handleFinish = async () => {
    setError(null);
    if (!storeName.trim()) {
      setError("يرجى كتابة اسم المخزن أو المحل");
      setStep(2);
      return;
    }

    if (!fullName.trim() || !username.trim() || !password) {
      setError("يرجى ملء جميع حقول حساب المدير");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين");
      return;
    }

    setLoading(true);

    try {
      // 1. Save business settings
      await settingsRepository.setManySettings({
        store_name: storeName.trim(),
        business_type: businessType.trim(),
        phone: phone.trim(),
        address: address.trim(),
        currency: currency.trim(),
      });

      // 2. Save feature toggles
      for (const [featId, isEnabled] of Object.entries(features)) {
        await settingsRepository.toggleFeature(featId, isEnabled);
      }
      await loadFeatures();

      // 3. Create Super Admin user
      await authService.createSuperAdmin(
        fullName.trim(),
        username.trim(),
        password,
        adminPhone.trim()
      );

      // Navigate to login so the user can verify their credentials
      setUser(null);
      navigate("/login");
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 select-none" dir="rtl">
      <div className="w-full max-w-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-4">
          {[
            { num: 1, title: "ترحيب" },
            { num: 2, title: "بيانات النشاط" },
            { num: 3, title: "المميزات" },
            { num: 4, title: "حساب المدير" },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  step === s.num
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : step > s.num
                    ? "bg-success text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`text-xs hidden sm:inline font-medium ${
                  step === s.num ? "text-foreground font-bold" : "text-muted-foreground"
                }`}
              >
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <Card className="border-border shadow-md">
          {error && (
            <div className="m-6 mb-0 rounded-md bg-danger/10 p-3 text-xs text-danger text-right">
              {error}
            </div>
          )}

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <>
              <CardHeader className="text-center py-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                  <Store className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-bold">أهلاً بيك 👋</CardTitle>
                <CardDescription className="text-base mt-2">
                  خلينا نجهز البرنامج على حسب شغلك في خطوات بسيطة وسريعة.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-right text-sm text-muted-foreground">
                <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
                  <p className="font-semibold text-foreground">في دقائق معدودة هنحدد سوا:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>اسم المخزن أو المحل وعنوانك وأرقام التواصل.</li>
                    <li>الموديولات والمميزات اللي محتاجها في نشاطك (المشتريات، الموردين، العملاء، إلخ).</li>
                    <li>إنشاء حساب المدير الرئيسي المسؤول عن البرنامج.</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-start">
                <Button onClick={() => setStep(2)} className="gap-2">
                  <span>ابدأ الإعداد الآن</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {/* STEP 2: BUSINESS DETAILS */}
          {step === 2 && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="text-lg">بيانات المخزن أو المحل</CardTitle>
                <CardDescription>البيانات دي هتظهر في فواتير البيع والشراء والتقارير</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">اسم المخزن / المحل *</label>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="مثال: مخزن النور للسيراميك والأدوات"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">نوع النشاط</label>
                  <Input
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="مثال: سيراميك، مواد بناء، أدوات صحية، قطع غيار"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">رقم الهاتف</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010xxxxxxxx"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">العملة</label>
                    <Input
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="ج.م"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">العنوان</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="المدينة، الشارع، علامة مميزة"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  السابق
                </Button>
                <Button onClick={() => setStep(3)} className="gap-2">
                  <span>التالي (اختيار المميزات)</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {/* STEP 3: SELECT FEATURES */}
          {step === 3 && (
            <>
              <CardHeader className="text-right">
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">اختار المميزات اللي محتاجها</CardTitle>
                </div>
                <CardDescription>تقدر تغير الاختيارات دي بعدين في أي وقت من شاشة الإعدادات.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-right">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                  <div className="p-3 rounded-lg border border-border bg-muted/20">
                    <Checkbox
                      checked={true}
                      disabled={true}
                      label="المخزون والمنتجات والبيع (أساسي)"
                      description="الميزات الأساسية لا يمكن تعطيلها لضمان عمل النظام."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.purchases}
                      onChange={(e) => handleToggleFeature("purchases", e.target.checked)}
                      label="المشتريات والتوريد"
                      description="تسجيل فواتير الشراء وزيادة المخزون وتكلفة البضاعة."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.suppliers}
                      onChange={(e) => handleToggleFeature("suppliers", e.target.checked)}
                      label="الموردين والأرصدة"
                      description="متابعة حسابات الموردين والدفعات والمتبقي."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.customers}
                      onChange={(e) => handleToggleFeature("customers", e.target.checked)}
                      label="العملاء والبيع الآجل"
                      description="تسجيل ديون العملاء وتاريخ مسحوباتهم والدفعات."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.expenses}
                      onChange={(e) => handleToggleFeature("expenses", e.target.checked)}
                      label="المصروفات اليومية"
                      description="تسجيل الإيجار والكهرباء والمرتبات وحساب صافي الربح."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.barcode}
                      onChange={(e) => handleToggleFeature("barcode", e.target.checked)}
                      label="الباركود وقارئ الباركود"
                      description="توليد الباركود والبحث الفوري أثناء البيع."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.reports}
                      onChange={(e) => handleToggleFeature("reports", e.target.checked)}
                      label="التقارير والأرباح"
                      description="إحصائيات تفصيلية للأرباح، المبيعات، وركود المخزون."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.users}
                      onChange={(e) => handleToggleFeature("users", e.target.checked)}
                      label="المستخدمين والصلاحيات"
                      description="إضافة كاشير ومسؤول مخزن مع تحديد صلاحيات دقيقة."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.activity_log}
                      onChange={(e) => handleToggleFeature("activity_log", e.target.checked)}
                      label="سجل النشاط والمراقبة"
                      description="تتبع من قام بالإضافة والتعديل والبيع والحذف."
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-border hover:bg-muted/10">
                    <Checkbox
                      checked={features.notifications}
                      onChange={(e) => handleToggleFeature("notifications", e.target.checked)}
                      label="الإشعارات والتنبيهات"
                      description="تنبيهات انخفاض رصيد المنتجات والعمليات الهامة."
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  السابق
                </Button>
                <Button onClick={() => setStep(4)} className="gap-2">
                  <span>التالي (حساب المدير)</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {/* STEP 4: ADMIN ACCOUNT */}
          {step === 4 && (
            <>
              <CardHeader className="text-right">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">إنشاء حساب المدير الرئيسي</CardTitle>
                </div>
                <CardDescription>هذا الحساب يملك كامل الصلاحيات لإدارة البرنامج والمستخدمين.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">اسم المدير بالكامل *</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أحمد محمود"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">اسم المستخدم لتسجيل الدخول *</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: admin"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">كلمة المرور *</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">تأكيد كلمة المرور *</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">رقم الهاتف (اختياري)</label>
                  <Input
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)} disabled={loading}>
                  السابق
                </Button>
                <Button onClick={handleFinish} disabled={loading} className="gap-2">
                  <span>{loading ? "جاري الحفظ والتهيئة..." : "إنهاء والبدء في استخدام البرنامج"}</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
