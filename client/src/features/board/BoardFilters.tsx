import { useCards } from "@/hooks/card/useCards";
import { useParams } from "react-router";
import React, { useState } from "react";
import { X, Filter } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useBoardStore } from "@/stores/board.store";

export const BoardFilters: React.FC = () => {
  const { projectId = "" } = useParams();
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const { data: cards = [] } = useCards({ project_id: projectId });
  const assignees = Array.from(
    new Map(
      cards.flatMap((c) => c.assignees).map((a) => [a.user_id, a]),
    ).values(),
  );
  const labels = Array.from(
    new Map(cards.flatMap((c) => c.labels).map((l) => [l.id, l])).values(),
  );
  const selectedAssignee = useBoardStore((s) => s.selectedAssigneeId),
    selectedLabel = useBoardStore((s) => s.selectedLabelId);
  const setAssignee = useBoardStore((s) => s.setSelectedAssigneeId),
    setLabel = useBoardStore((s) => s.setSelectedLabelId);

  const searchQuery = useBoardStore((s) => s.searchQuery);
  const setSearchQuery = useBoardStore((s) => s.setSearchQuery);
  const filterPriority = useBoardStore((s) => s.filterPriority);
  const setFilterPriority = useBoardStore((s) => s.setFilterPriority);
  const resetFilters = useBoardStore((s) => s.resetFilters);

  const filterCount = [
    filterPriority !== "all",
    !!selectedAssignee,
    !!selectedLabel,
  ].filter(Boolean).length;

  const hasActiveFilters = !!searchQuery || filterCount > 0;

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
      {/* Primary search & mobile filter trigger row */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="flex-1 sm:w-48 md:w-56">
          <Input
            placeholder="Filter cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Mobile filter toggle button */}
        <Button
          size="sm"
          variant={mobileExpanded || filterCount > 0 ? "secondary" : "outline"}
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="sm:hidden h-8.5 px-2.5 flex items-center gap-1.5 shrink-0"
          title="Toggle filters"
        >
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs">Filters</span>
          {filterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={resetFilters}
            className="sm:hidden text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 h-8.5 px-2 shrink-0"
            title="Clear filters"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Filter dropdowns: visible on desktop, or collapsible on mobile */}
      <div
        className={`${
          mobileExpanded ? "flex" : "hidden"
        } sm:flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto pt-1 sm:pt-0`}
      >
        {/* Priority Selector */}
        <div className="w-[calc(50%-0.25rem)] sm:w-36">
          <Select
            value={filterPriority}
            onChange={(val) => setFilterPriority(val)}
            size="sm"
            options={[
              { label: "All Priorities", value: "all" },
              { label: "Urgent", value: "urgent" },
              { label: "High", value: "high" },
              { label: "Medium", value: "medium" },
              { label: "Low", value: "low" },
            ]}
          />
        </div>

        <div className="w-[calc(50%-0.25rem)] sm:w-36">
          <Select
            placeholder="All assignees"
            value={selectedAssignee || ""}
            onChange={(v) => setAssignee(v || null)}
            size="sm"
            options={[
              { value: "", label: "All assignees" },
              ...assignees.map((a) => ({
                value: a.user_id,
                label: a.display_name,
              })),
            ]}
          />
        </div>

        <div className="w-full sm:w-36">
          <Select
            placeholder="All labels"
            value={selectedLabel || ""}
            onChange={(v) => setLabel(v || null)}
            size="sm"
            options={[
              { value: "", label: "All labels" },
              ...labels.map((l) => ({ value: l.id, label: l.name })),
            ]}
          />
        </div>

        {/* Desktop Clear Filter Button */}
        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={resetFilters}
            className="hidden sm:inline-flex text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 h-8.5 px-2.5"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
