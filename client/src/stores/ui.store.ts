import { create } from 'zustand';

interface UiStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  commandPaletteOpen: boolean;
  activeCardId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openCardModal: (cardId: string) => void;
  closeCardModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  theme: (localStorage.getItem('taskflow_theme') as 'light' | 'dark') || 'light',
  commandPaletteOpen: false,
  activeCardId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('taskflow_theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: nextTheme };
    }),

  setTheme: (theme) => {
    localStorage.setItem('taskflow_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  openCardModal: (cardId) => set({ activeCardId: cardId }),
  closeCardModal: () => set({ activeCardId: null }),
}));
