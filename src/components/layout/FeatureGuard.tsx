// ==========================================================
// src/components/layout/FeatureGuard.tsx
// حارس الموديولات لمنع الوصول للواجهات غير المفعلة
// ==========================================================

import * as React from "react";
import { useFeature } from "@/stores/featureStore";
import { EmptyState } from "@/components/ui/empty-state";
import { SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGuard({ feature, children, fallback }: FeatureGuardProps) {
  const isEnabled = useFeature(feature);
  const navigate = useNavigate();

  if (!isEnabled) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="p-8">
        <EmptyState
          icon={SlidersHorizontal}
          title="هذه الميزة غير مفعلة حالياً"
          description="تم تعطيل هذا الموديول في إعدادات النظام. يمكنك إعادة تفعيله في أي وقت من شاشة الإعدادات إذا كنت تملك صلاحيات المدير."
          actionText="الانتقال إلى الإعدادات"
          onAction={() => navigate("/settings")}
        />
      </div>
    );
  }

  return <>{children}</>;
}
