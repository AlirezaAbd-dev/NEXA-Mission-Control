import "@/lib/brandStorage";
import { create } from "zustand";

export type ThemePaletteId =
  | "teal"
  | "neutral"
  | "amber"
  | "blue"
  | "indigo"
  | "violet"
  | "rose"
  | "pink"
  | "brown";

export const THEME_PALETTES: readonly ThemePaletteId[] = [
  "teal",
  "neutral",
  "amber",
  "blue",
  "indigo",
  "violet",
  "rose",
  "pink",
  "brown",
];

const UI_THEME_KEY = "mission_control_ui_theme";
const SIDEBAR_COLLAPSED_KEY = "mission_control_sidebar_collapsed";

function readInitialPalette(): ThemePaletteId {
  try {
    const saved = localStorage.getItem(UI_THEME_KEY)?.toLowerCase();
    return THEME_PALETTES.find((p) => p === saved) ?? "teal";
  } catch {
    return "teal";
  }
}

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

interface UiStore {
  mutationError: string | null;
  setMutationError: (error: string | null) => void;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: "light" | "dark";
  uiTheme: ThemePaletteId;
  previewUiTheme: ThemePaletteId | null;
  commandPaletteOpen: boolean;
  activeCardId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setUiTheme: (palette: ThemePaletteId) => void;
  setPreviewUiTheme: (palette: ThemePaletteId | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openCardModal: (cardId: string) => void;
  closeCardModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  mutationError: null,
  setMutationError: (mutationError) => set({ mutationError }),
  sidebarOpen:
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  sidebarCollapsed: typeof window !== "undefined" ? readSidebarCollapsed() : false,
  theme:
    (localStorage.getItem("mission_control_theme") as "light" | "dark") ||
    (document.documentElement.classList.contains("dark") ? "dark" : "light"),
  uiTheme: typeof window !== "undefined" ? readInitialPalette() : "teal",
  previewUiTheme: null,
  commandPaletteOpen: false,
  activeCardId: new URLSearchParams(window.location.search).get("card"),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (collapsed) => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
    set({ sidebarCollapsed: collapsed });
  },

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("mission_control_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      }
      return { theme: nextTheme };
    }),

  setTheme: (theme) => {
    localStorage.setItem("mission_control_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    }
    set({ theme });
  },

  setUiTheme: (uiTheme) => {
    try {
      localStorage.setItem(UI_THEME_KEY, uiTheme);
    } catch {
      /* ignore */
    }
    set({ uiTheme, previewUiTheme: null });
  },
  setPreviewUiTheme: (previewUiTheme) => set({ previewUiTheme }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  openCardModal: (cardId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("card", cardId);
    window.history.replaceState(null, "", url);
    set({ activeCardId: cardId });
  },
  closeCardModal: () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("card");
    window.history.replaceState(null, "", url);
    set({ activeCardId: null });
  },
}));
