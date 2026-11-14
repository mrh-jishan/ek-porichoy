"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Client-only UI state (Zustand). Server data never lives here — it comes from
 * React Server Components, Server Actions and TanStack Query.
 */
type TextSize = "md" | "lg" | "xl";
interface Preferences {
  textSize: TextSize;
  highContrast: boolean;
  sidebarOpen: boolean;
  cycleTextSize: (dir: 1 | -1) => void;
  toggleContrast: () => void;
  setSidebar: (open: boolean) => void;
}

const SIZES: TextSize[] = ["md", "lg", "xl"];

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      textSize: "md",
      highContrast: false,
      sidebarOpen: false,
      cycleTextSize: (dir) =>
        set((s) => ({ textSize: SIZES[Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(s.textSize) + dir))]! })),
      toggleContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      setSidebar: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: "ep-preferences", partialize: ({ textSize, highContrast }) => ({ textSize, highContrast }) },
  ),
);
