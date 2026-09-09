// ==========================================================
// src/features/settings/SettingsPage.tsx
// شاشة إعدادات النظام وتخصيص الموديولات (Features)
// ==========================================================

import * as React from "react";
import {
  Settings,
  Store,
  ShoppingCart,
  Boxes,
  Palette,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { settingsRepository } from "@/database/repositories/settingsRepository";
import { useFeatureStore } from "@/stores/featureStore";
import { FeatureRow } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsPage() {
  const { features, toggleFeature, loadFeatures } = useFeatureStore();
  const [activeTab, setActiveTab] = React.useState("store");

  // Settings State
  const [storeName, setStoreName] = React.useState("");
  const [businessType, setBusinessType] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [currency, setCurrency] = React.useState("ج.م");

  const [allowNegativeStock, setAllowNegativeStock] = React.useState(false);
  const [allowCreditSales, setAllowCreditSales] = React.useState(true);
  const [defaultMinStock, setDefaultMinStock] = React.useState("5");
  const [costMethod, setCostMethod] = React.useState("FIFO");

  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const s = await settingsRepository.getAllSettings();
        setStoreName(s.store_name || "");
        setBusinessType(s.business_type || "");
        setPhone(s.phone || "");
        setAddress(s.address || "");
        setCurrency(s.currency || "ج.م");

        setAllowNegativeStock(s.allow_negative_stock === "true");
        setAllowCreditSales(s.allow_credit_sales !== "false");
        setDefaultMinStock(s.default_minimum_stock || "5");
        setCostMethod(s.cost_calculation_method || "FIFO");

        await loadFeatures();
      } catch (e) {
        console.error("فشل تحميل الإعدادات:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);

    try {
      await settingsRepository.setManySettings({
        store_name: storeName.trim(),
        business_type: businessType.trim(),
        phone: phone.trim(),
        address: address.trim(),
        currency: currency.trim(),
        allow_negative_stock: allowNegativeStock ? "true" : "false",
        allow_credit_sales: allowCreditSales ? "true" : "false",
        default_minimum_stock: defaultMinStock,
        cost_calculation_method: costMethod,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      alert("فشل حفظ الإعدادات: " + e?.message);
    }
  };

  const handleFeatureToggle = async (feat: FeatureRow, checked: boolean) => {
    try {
      await toggleFeature(feat.id, checked);
    } catch (e: any) {
      alert(e?.message || "تعذر تعديل حالة الميزة");
    }
  };

  return (
    <div className="space-y-5 select-none" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإعدادات العامة</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            تخصيص بيانات النشاط التجاري، قواعد المخزون والبيع، وتفعيل أو تعطيل الموديولات.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-3 py-1.5 rounded-md border border-success/30">
            <CheckCircle2 className="h-4 w-4" />
            <span>تم حفظ الإعدادات بنجاح</span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted mb-4">
          <TabsTrigger value="store" className="gap-1.5">
            <Store className="h-4 w-4" />
            <span>بيانات المحل / المخزن</span>
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" />
            <span>قواعد البيع والمخزون</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5">
            <Sliders className="h-4 w-4" />
            <span>تخصيص المميزات (Features)</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STORE INFO */}
        <TabsContent value="store">
          <Card className="border-border max-w-2xl shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">بيانات المنشأة التجارية</CardTitle>
              <CardDescription>البيانات التي تطبع على فواتير البيع وإيصالات الاستلام</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveGeneral} className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">اسم المخزن أو المحل</label>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="مخزن الأمل للتشطيبات"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">النشاط التجاري</label>
                  <Input
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="سيراميك وبورسلين وأدوات صحية"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">رقم الهاتف</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010xxxxxxxx"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">العملة الافتراضية</label>
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
                    placeholder="العنوان بالتفصيل"
                  />
                </div>

                <Button type="submit" className="gap-2 mt-3">
                  <Save className="h-4 w-4" />
                  <span>حفظ التعديلات</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SALES & INVENTORY RULES */}
        <TabsContent value="sales">
          <Card className="border-border max-w-2xl shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">قواعد وضوابط العمليات</CardTitle>
              <CardDescription>التحكم في قيود المخزون والبيع الآجل</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveGeneral} className="space-y-4 text-right">
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                  <Checkbox
                    checked={allowNegativeStock}
                    onChange={(e) => setAllowNegativeStock(e.target.checked)}
                    label="السماح بالبيع بمخزون سالب (افتراضي: غير مفعل)"
                    description="عند تفعيل هذا الخيار، سيسمح النظام بإصدار فواتير بيع حتى لو كانت الكمية بالمخزن صفراً أو غير كافية."
                  />
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                  <Checkbox
                    checked={allowCreditSales}
                    onChange={(e) => setAllowCreditSales(e.target.checked)}
                    label="تفعيل خيار البيع الآجل (على الحساب)"
                    description="إتاحة إصدار فواتير بمديونية ترحل لحساب العميل."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">الحد الأدنى الافتراضي للمنتج الجديد</label>
                    <Input
                      type="number"
                      value={defaultMinStock}
                      onChange={(e) => setDefaultMinStock(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">طريقة تسعير تكلفة المخزون</label>
                    <Select value={costMethod} onChange={(e) => setCostMethod(e.target.value)}>
                      <option value="FIFO">الوارد أولاً يصرف أولاً (FIFO)</option>
                      <option value="AVG">متوسط التكلفة المرجح (Average Cost)</option>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="gap-2 mt-3">
                  <Save className="h-4 w-4" />
                  <span>حفظ القواعد</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: FEATURES SELECTION */}
        <TabsContent value="features">
          <Card className="border-border max-w-2xl shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">تفعيل وتعطيل الميزات الاختيارية (Feature Registry)</CardTitle>
              <CardDescription>
                الميزة المعطلة تختفي تماماً من القائمة الجانبية والشاشات لمنع التشتت.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {features.map((feat) => {
                  const isCore = feat.is_core === 1;
                  const isChecked = isCore ? true : feat.is_enabled === 1;

                  return (
                    <div
                      key={feat.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isCore
                          ? "bg-muted/40 border-border"
                          : "bg-card border-border hover:bg-muted/10"
                      }`}
                    >
                      <div className="space-y-0.5 text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {feat.name_ar}
                          </span>
                          {isCore && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                              أساسي لا يمكن تعطيله
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{feat.description_ar}</p>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          disabled={isCore}
                          checked={isChecked}
                          onChange={(e) => handleFeatureToggle(feat, e.target.checked)}
                          className="h-4 w-4 rounded border-primary text-primary accent-primary cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
