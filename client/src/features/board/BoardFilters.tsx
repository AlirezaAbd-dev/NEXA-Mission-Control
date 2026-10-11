import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useBoardStore } from '@/stores/board.store';

export const BoardFilters: React.FC = () => {
  const searchQuery = useBoardStore((s) => s.searchQuery);
  const setSearchQuery = useBoardStore((s) => s.setSearchQuery);
  const filterPriority = useBoardStore((s) => s.filterPriority);
  const setFilterPriority = useBoardStore((s) => s.setFilterPriority);
  const resetFilters = useBoardStore((s) => s.resetFilters);

  const hasActiveFilters = !!searchQuery || filterPriority !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <div className="w-56 md:w-64">
        <Input
          placeholder="Filter cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Priority Selector */}
      <div className="w-36">
        <Select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
      </div>

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <Button
          size="sm"
          variant="ghost"
          onClick={resetFilters}
          className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 h-8 px-2"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};
