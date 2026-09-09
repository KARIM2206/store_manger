// ==========================================================
// src/components/layout/PermissionGuard.tsx
// حارس الصلاحيات للمستخدمين
// ==========================================================

import * as React from "react";
import { useAuthStore } from "@/stores/authStore";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldAlert } from "lucide-react";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  permission,
  children,
  fallback,
}: PermissionGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission(permission));

  if (!hasPermission) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="p-8">
        <EmptyState
          icon={ShieldAlert}
          title="عفواً، لا تملك الصلاحية للوصول"
          description="حسابك لا يمتلك الصلاحية الكافية لعرض هذه الشاشة أو تنفيذ هذا الإجراء. يرجى مراجعة مدير النظام."
        />
      </div>
    );
  }

  return <>{children}</>;
}
