// ==========================================================
// src/components/layout/AppLayout.tsx
// الهيكل العام لواجهة التطبيق
// ==========================================================

import * as React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
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
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onOpenGlobalSearch={() => setSearchOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-5 md:p-6 bg-background">
          <Outlet />
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
