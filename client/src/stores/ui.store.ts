import "@/lib/brandStorage";
import { create } from "zustand";

interface UiStore {
  mutationError: string | null;
  setMutationError: (error: string | null) => void;
  sidebarOpen: boolean;
  theme: "light" | "dark";
  commandPaletteOpen: boolean;
  activeCardId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openCardModal: (cardId: string) => void;
  closeCardModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  mutationError: null,
  setMutationError: (mutationError) => set({ mutationError }),
  sidebarOpen: true,
  theme:
    (localStorage.getItem("mission_control_theme") as "light" | "dark") ||
    (document.documentElement.classList.contains("dark") ? "dark" : "light"),
  commandPaletteOpen: false,
  activeCardId: new URLSearchParams(window.location.search).get("card"),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

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
