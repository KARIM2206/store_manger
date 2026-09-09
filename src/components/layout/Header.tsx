// ==========================================================
// src/components/layout/Header.tsx
// الشريط العلوي للتطبيق
// ==========================================================

import * as React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  Settings,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useFeature } from "@/stores/featureStore";
import { notificationRepository } from "@/database/repositories/notificationRepository";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationRow } from "@/types/database";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileMenu: () => void;
  onOpenGlobalSearch: () => void;
}

export function Header({ onToggleSidebar, onToggleMobileMenu, onOpenGlobalSearch }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const hasNotifications = useFeature("notifications");

  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  const [unreadNotifications, setUnreadNotifications] = React.useState<NotificationRow[]>([]);

  React.useEffect(() => {
    if (hasNotifications) {
      notificationRepository.getUnread().then(setUnreadNotifications).catch(console.error);
    }
  }, [hasNotifications, location.pathname]);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
      localStorage.setItem("theme", "dark");
    }
  };

  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path === "/") return "لوحة التحكم";
    if (path.startsWith("/products")) return "المنتجات";
    if (path.startsWith("/categories")) return "التصنيفات";
    if (path.startsWith("/inventory")) return "المخزون وحركات المستودع";
    if (path.startsWith("/sales")) return "المبيعات ونقاط البيع (POS)";
    if (path.startsWith("/purchases")) return "المشتريات والتوريد";
    if (path.startsWith("/customers")) return "العملاء والأرصدة";
    if (path.startsWith("/suppliers")) return "الموردين والأرصدة";
    if (path.startsWith("/expenses")) return "المصروفات";
    if (path.startsWith("/reports")) return "التقارير والأرباح";
    if (path.startsWith("/users")) return "المستخدمين والصلاحيات";
    if (path.startsWith("/activity")) return "سجل النشاط";
    if (path.startsWith("/notifications")) return "الإشعارات والتنبيهات";
    if (path.startsWith("/backup")) return "النسخ الاحتياطي";
    if (path.startsWith("/settings")) return "الإعدادات العامة";
    return "";
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-2 sm:px-4 select-none z-20 min-w-0">
      {/* Right side: Menu Toggle + Breadcrumb */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Desktop Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="flex md:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sm max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
          <span className="font-semibold text-foreground truncate">{getBreadcrumbTitle()}</span>
        </div>
      </div>

      {/* Center: Search trigger with Ctrl+K shortcut badge */}
      <div className="flex-1 flex justify-end md:justify-center px-2">
        <button
          onClick={onOpenGlobalSearch}
          className="hidden md:flex items-center gap-3 rounded-md border border-input bg-background/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors w-72 justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">بحث سريع عن منتج أو عميل...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground shrink-0">
            Ctrl+K
          </kbd>
        </button>
        <button
          onClick={onOpenGlobalSearch}
          className="flex md:hidden p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="بحث سريع"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Left side: Notifications, Theme Toggle, User Menu */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications Icon (if feature enabled) */}
        {hasNotifications && (
          <Link
            to="/notifications"
            className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="الإشعارات"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
              </span>
            )}
          </Link>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={isDark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}
        >
          {isDark ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="flex items-center gap-2 cursor-pointer p-1.5 rounded-md hover:bg-muted transition-colors min-w-0 max-w-[120px] sm:max-w-none">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                {user?.full_name?.charAt(0) || "م"}
              </div>
              <div className="hidden sm:flex flex-col text-right min-w-0">
                <span className="text-xs font-semibold text-foreground leading-tight truncate">
                  {user?.full_name || "المدير"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {user?.role_name_ar || "مدير النظام"}
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="left" className="w-48">
            <div className="px-2 py-1.5 border-b border-border">
              <p className="text-xs font-semibold text-foreground">{user?.full_name}</p>
              <p className="text-[11px] text-muted-foreground">{user?.username}</p>
            </div>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 ml-2" />
              <span>الإعدادات</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4 ml-2" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
