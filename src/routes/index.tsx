// ==========================================================
// src/routes/index.tsx
// نظام التوجيه ومسارات التطبيق مع حراس الميزات والصلاحيات
// ==========================================================

import * as React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeatureGuard } from "@/components/layout/FeatureGuard";
import { LoginPage } from "@/features/auth/LoginPage";
import { SetupWizard } from "@/features/setup/SetupWizard";

// Pages
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { SalesPage } from "@/features/sales/SalesPage";
import { PurchasesPage } from "@/features/purchases/PurchasesPage";
import { CustomersPage } from "@/features/customers/CustomersPage";
import { SuppliersPage } from "@/features/suppliers/SuppliersPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { UsersPage } from "@/features/users/UsersPage";
import { ActivityLogPage } from "@/features/activity/ActivityLogPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { BackupPage } from "@/features/backup/BackupPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { BarcodePage } from "@/features/barcode/BarcodePage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const [checking, setChecking] = React.useState(true);
  const [needsSetup, setNeedsSetup] = React.useState(false);

  React.useEffect(() => {
    async function check() {
      try {
        const req = await authService.isSetupNeeded();
        setNeedsSetup(req);
      } catch (e) {
        console.error("فشل التحقق من حالة الإعداد الأول:", e);
      } finally {
        setChecking(false);
      }
    }
    check();
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
        جاري تهيئة النظام...
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupWizard />} />

      {/* Protected Desktop App Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route
          path="products"
          element={
            <FeatureGuard feature="products">
              <ProductsPage />
            </FeatureGuard>
          }
        />
        <Route
          path="categories"
          element={
            <FeatureGuard feature="categories">
              <CategoriesPage />
            </FeatureGuard>
          }
        />
        <Route
          path="inventory"
          element={
            <FeatureGuard feature="inventory">
              <InventoryPage />
            </FeatureGuard>
          }
        />
        <Route
          path="barcode"
          element={
            <FeatureGuard feature="barcode">
              <BarcodePage />
            </FeatureGuard>
          }
        />
        <Route
          path="sales"
          element={
            <FeatureGuard feature="sales">
              <SalesPage />
            </FeatureGuard>
          }
        />
        <Route
          path="purchases"
          element={
            <FeatureGuard feature="purchases">
              <PurchasesPage />
            </FeatureGuard>
          }
        />
        <Route
          path="customers"
          element={
            <FeatureGuard feature="customers">
              <CustomersPage />
            </FeatureGuard>
          }
        />
        <Route
          path="suppliers"
          element={
            <FeatureGuard feature="suppliers">
              <SuppliersPage />
            </FeatureGuard>
          }
        />
        <Route
          path="expenses"
          element={
            <FeatureGuard feature="expenses">
              <ExpensesPage />
            </FeatureGuard>
          }
        />
        <Route
          path="reports"
          element={
            <FeatureGuard feature="reports">
              <ReportsPage />
            </FeatureGuard>
          }
        />
        <Route
          path="users"
          element={
            <FeatureGuard feature="users">
              <UsersPage />
            </FeatureGuard>
          }
        />
        <Route
          path="activity"
          element={
            <FeatureGuard feature="activity_log">
              <ActivityLogPage />
            </FeatureGuard>
          }
        />
        <Route
          path="notifications"
          element={
            <FeatureGuard feature="notifications">
              <NotificationsPage />
            </FeatureGuard>
          }
        />
        <Route
          path="backup"
          element={
            <FeatureGuard feature="backup">
              <BackupPage />
            </FeatureGuard>
          }
        />
        <Route
          path="settings"
          element={
            <FeatureGuard feature="settings">
              <SettingsPage />
            </FeatureGuard>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
