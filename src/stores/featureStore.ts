// ==========================================================
// src/stores/featureStore.ts
// سجل المميزات وإدارة الموديولات المفعلة (Feature Registry)
// ==========================================================

import { create } from "zustand";
import { settingsRepository } from "@/database/repositories/settingsRepository";
import { FeatureRow } from "@/types/database";

interface FeatureState {
  features: FeatureRow[];
  featureMap: Record<string, boolean>;
  isLoading: boolean;
  loadFeatures: () => Promise<void>;
  toggleFeature: (featureId: string, isEnabled: boolean) => Promise<void>;
  hasFeature: (featureId: string) => boolean;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  features: [],
  featureMap: {},
  isLoading: true,

  loadFeatures: async () => {
    try {
      const list = await settingsRepository.getAllFeatures();
      const map: Record<string, boolean> = {};
      list.forEach((f) => {
        map[f.id] = f.is_core === 1 ? true : f.is_enabled === 1;
      });
      set({ features: list, featureMap: map, isLoading: false });
    } catch (e) {
      console.error("فشل تحميل المميزات:", e);
      set({ isLoading: false });
    }
  },

  toggleFeature: async (featureId: string, isEnabled: boolean) => {
    await settingsRepository.toggleFeature(featureId, isEnabled);
    await get().loadFeatures();
  },

  hasFeature: (featureId: string) => {
    const { featureMap } = get();
    // Core features are always enabled
    const coreFeatures = [
      "dashboard",
      "products",
      "categories",
      "inventory",
      "sales",
      "backup",
      "settings",
    ];
    if (coreFeatures.includes(featureId)) return true;

    return featureMap[featureId] ?? false;
  },
}));

export function useFeature(featureId: string): boolean {
  return useFeatureStore((state) => state.hasFeature(featureId));
}
