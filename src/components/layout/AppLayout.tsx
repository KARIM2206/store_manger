// ==========================================================
// src/components/layout/AppLayout.tsx
// الهيكل العام لواجهة التطبيق
// ==========================================================

import * as React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalSearchDialog } from "./GlobalSearchDialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K -> Global Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground" dir="rtl">
      {/* Sidebar on Right */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Area on Left */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          onOpenGlobalSearch={() => setSearchOpen(true)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden page-container bg-background min-w-0 w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar via Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} side="right">
        {/* We don't use SheetContent padding here because Sidebar handles it */}
        <SheetContent className="p-0 w-72 max-w-[85vw] border-none">
          <Sidebar
            collapsed={false}
            onToggle={() => {}}
            isMobile={true}
          />
        </SheetContent>
      </Sheet>

      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
