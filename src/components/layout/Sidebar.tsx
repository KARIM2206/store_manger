// ==========================================================
// src/components/layout/Sidebar.tsx
// القائمة الجانبية (يمين RTL) مع الدعم الكامل للميزات الديناميكية والطي
// ==========================================================

import * as React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Layers,
  Barcode,
  ShoppingCart,
  ShoppingBag,
  Users,
  Truck,
  Receipt,
  BarChart3,
  UserCheck,
  History,
  Bell,
  Settings,
  Database,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useFeatureStore } from "@/stores/featureStore";
import { useAuthStore } from "@/stores/authStore";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: React.ElementType;
  feature?: string;
  permission?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

export function Sidebar({ collapsed, onToggle, isMobile }: SidebarProps) {
  const hasFeature = useFeatureStore((s) => s.hasFeature);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const sections: NavSection[] = [
    {
      title: "الرئيسية",
      items: [
        { id: "dashboard", title: "لوحة التحكم", path: "/", icon: LayoutDashboard, feature: "dashboard" },
      ],
    },
    {
      title: "المخزون",
      items: [
        { id: "products", title: "المنتجات", path: "/products", icon: Package, feature: "products", permission: "products.view" },
        { id: "categories", title: "التصنيفات", path: "/categories", icon: Layers, feature: "categories" },
        { id: "inventory", title: "المخزون والحركات", path: "/inventory", icon: Boxes, feature: "inventory", permission: "inventory.view" },
        { id: "barcode", title: "طباعة الباركود", path: "/barcode", icon: Barcode, feature: "barcode" },
      ],
    },
    {
      title: "المبيعات",
      items: [
        { id: "sales", title: "المبيعات (POS)", path: "/sales", icon: ShoppingCart, feature: "sales", permission: "sales.view" },
      ],
    },
    {
      title: "المشتريات",
      items: [
        { id: "purchases", title: "المشتريات", path: "/purchases", icon: ShoppingBag, feature: "purchases", permission: "purchases.view" },
      ],
    },
    {
      title: "الأطراف",
      items: [
        { id: "customers", title: "العملاء", path: "/customers", icon: Users, feature: "customers", permission: "customers.view" },
        { id: "suppliers", title: "الموردين", path: "/suppliers", icon: Truck, feature: "suppliers", permission: "suppliers.view" },
      ],
    },
    {
      title: "الماليات",
      items: [
        { id: "expenses", title: "المصروفات", path: "/expenses", icon: Receipt, feature: "expenses" },
        { id: "reports", title: "التقارير والأرباح", path: "/reports", icon: BarChart3, feature: "reports", permission: "reports.view" },
      ],
    },
    {
      title: "الإدارة",
      items: [
        { id: "users", title: "المستخدمين", path: "/users", icon: UserCheck, feature: "users", permission: "users.view" },
        { id: "activity", title: "سجل النشاط", path: "/activity", icon: History, feature: "activity_log" },
      ],
    },
    {
      title: "النظام",
      items: [
        { id: "notifications", title: "الإشعارات", path: "/notifications", icon: Bell, feature: "notifications" },
        { id: "backup", title: "النسخ الاحتياطي", path: "/backup", icon: Database, feature: "backup", permission: "backup.create" },
        { id: "settings", title: "الإعدادات", path: "/settings", icon: Settings, feature: "settings", permission: "settings.view" },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col border-border bg-card transition-all duration-300 select-none z-30",
        isMobile ? "w-full border-none h-full" : "hidden md:flex border-l",
        !isMobile && (collapsed ? "w-16" : "w-64")
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-border">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2 pr-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold shrink-0">
              م
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold leading-tight text-foreground truncate">مدير المخزن</span>
              <span className="text-[10px] text-muted-foreground truncate">نظام ERP محلي</span>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            م
          </div>
        )}

        <button
          onClick={onToggle}
          className={cn(
            "p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0",
            (collapsed || isMobile) && "hidden"
          )}
          title={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section, idx) => {
          // Filter items based on active features & permissions
          const visibleItems = section.items.filter((item) => {
            if (item.feature && !hasFeature(item.feature)) return false;
            if (item.permission && !hasPermission(item.permission)) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </div>
              )}
              {collapsed && <div className="h-px bg-border/60 my-2 mx-1" />}

              {visibleItems.map((item) => {
                const Icon = item.icon;

                const linkContent = (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        collapsed && "justify-center px-0 py-2",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-foreground hover:bg-muted"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {(!collapsed || isMobile) && <span className="truncate">{item.title}</span>}
                  </NavLink>
                );

                if (collapsed && !isMobile) {
                  return (
                    <Tooltip key={item.id} content={item.title} side="left">
                      {linkContent}
                    </Tooltip>
                  );
                }

                return <React.Fragment key={item.id}>{linkContent}</React.Fragment>;
              })}
            </div>
          );
        })}
      </div>

      {/* Footer Toggle button when collapsed */}
      {collapsed && !isMobile && (
        <div className="p-2 border-t border-border flex justify-center">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            title="توسيع القائمة"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
