// ==========================================================
// src/App.tsx
// المكون الجذري للتطبيق
// ==========================================================

import * as React from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AppRoutes } from "./routes";
import { useFeatureStore } from "./stores/featureStore";

export function App() {
  const { loadFeatures } = useFeatureStore();

  React.useEffect(() => {
    // Initialize Theme
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Load active features registry
    loadFeatures();
  }, [loadFeatures]);

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="bottom-left" dir="rtl" richColors />
    </BrowserRouter>
  );
}

export default App;
