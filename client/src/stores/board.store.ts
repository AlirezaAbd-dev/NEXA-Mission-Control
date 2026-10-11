import { create } from 'zustand';

interface BoardFilterStore {
  searchQuery: string;
  selectedPriority: string | null;
  selectedAssigneeId: string | null;
  selectedLabelId: string | null;
  viewMode: 'board' | 'backlog' | 'timeline' | 'calendar' | 'list';
  setSearchQuery: (query: string) => void;
  setSelectedPriority: (priority: string | null) => void;
  setSelectedAssigneeId: (id: string | null) => void;
  setSelectedLabelId: (id: string | null) => void;
  setViewMode: (mode: 'board' | 'backlog' | 'timeline' | 'calendar' | 'list') => void;
  resetFilters: () => void;
}

export const useBoardFilterStore = create<BoardFilterStore>((set) => ({
  searchQuery: '',
  selectedPriority: null,
  selectedAssigneeId: null,
  selectedLabelId: null,
  viewMode: 'board',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedPriority: (selectedPriority) => set({ selectedPriority }),
  setSelectedAssigneeId: (selectedAssigneeId) => set({ selectedAssigneeId }),
  setSelectedLabelId: (selectedLabelId) => set({ selectedLabelId }),
  setViewMode: (viewMode) => set({ viewMode }),
  resetFilters: () =>
    set({
      searchQuery: '',
      selectedPriority: null,
      selectedAssigneeId: null,
      selectedLabelId: null,
    }),
}));
