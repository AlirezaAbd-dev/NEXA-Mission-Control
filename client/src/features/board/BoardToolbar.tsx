import React, { useState } from "react";
import { useParams } from "react-router";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Star,
  X,
  Bookmark,
  Archive,
  Check,
} from "lucide-react";
import { Button, Input, Select, CustomSelect, Modal } from "@/components/ui";
import { ArchiveCenter } from "@/features/enterprise/ArchiveCenter";
import { useCards } from "@/hooks/card/useCards";
import { useBoardStore } from "@/stores/board.store";
import { usePreferences } from "@/hooks/enterprise/usePreferences";
import { useSavePreferences } from "@/hooks/enterprise/useSavePreferences";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { useSaveResource } from "@/hooks/enterprise/useSaveResource";
import { apiError } from "@/lib/apiError";

interface BoardToolbarProps {
  projectId: string;
}

const themeOptions = [
  { value: "petrol", label: "Petrol Dark", color: "#070e10" },
  { value: "teal", label: "Teal Glow", color: "#051c20" },
  { value: "ocean", label: "Ocean Blue", color: "#051524" },
  { value: "emerald", label: "Emerald Green", color: "#041a14" },
  { value: "sunset", label: "Sunset Twilight", color: "#1b0d28" },
  { value: "midnight", label: "Midnight Indigo", color: "#0e0f24" },
  { value: "purple", label: "Deep Purple", color: "#180a24" },
  { value: "slate", label: "Modern Slate", color: "#11171d" },
  { value: "neutral", label: "Neutral Minimal", color: "#090b0d" },
];

export const BoardToolbar: React.FC<BoardToolbarProps> = ({ projectId }) => {
  const { data: cards = [] } = useCards({ project_id: projectId });
  const { data: pref = {} } = usePreferences(projectId);
  const save = useSavePreferences(projectId);
  const { data: views = [] } = useEnterpriseResource(projectId, "views");
  const createView = useSaveResource(projectId, "views");

  // Board store filters
  const searchQuery = useBoardStore((s) => s.searchQuery);
  const setSearchQuery = useBoardStore((s) => s.setSearchQuery);
  const filterPriority = useBoardStore((s) => s.filterPriority);
  const setFilterPriority = useBoardStore((s) => s.setFilterPriority);
  const selectedAssignee = useBoardStore((s) => s.selectedAssigneeId);
  const setAssignee = useBoardStore((s) => s.setSelectedAssigneeId);
  const selectedLabel = useBoardStore((s) => s.selectedLabelId);
  const setLabel = useBoardStore((s) => s.setSelectedLabelId);
  const resetFilters = useBoardStore((s) => s.resetFilters);

  // Modals state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [saveViewModalOpen, setSaveViewModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [saveViewError, setSaveViewError] = useState("");

  const assignees = Array.from(
    new Map(
      cards.flatMap((c) => c.assignees).map((a) => [a.user_id, a]),
    ).values(),
  );
  const labels = Array.from(
    new Map(cards.flatMap((c) => c.labels).map((l) => [l.id, l])).values(),
  );

  const filterCount = [
    filterPriority !== "all",
    !!selectedAssignee,
    !!selectedLabel,
  ].filter(Boolean).length;

  const hasActiveFilters = !!searchQuery || filterCount > 0;

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      setSaveViewError("View name is required");
      return;
    }
    createView.mutate(
      {
        name: newViewName.trim(),
        config: {
          search: searchQuery,
          priority: filterPriority,
          assignee: selectedAssignee || "",
          label: selectedLabel || "",
          ...pref,
        },
      },
      {
        onSuccess: () => {
          setSaveViewModalOpen(false);
          setNewViewName("");
          setSaveViewError("");
        },
        onError: (e) => setSaveViewError(apiError(e)),
      },
    );
  };

  return (
    <div className="w-full shrink-0 space-y-2 pb-1">
      {/* ─── Mobile Toolbar (Screen < sm) ─── */}
      <div className="flex sm:hidden flex-col gap-2">
        <div className="flex items-center gap-1.5 w-full">
          {/* Search bar */}
          <div className="flex-1 min-w-0 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 pl-8 pr-2 text-xs rounded-xl bg-white dark:bg-[#0c181b] border border-slate-200/90 dark:border-[#183035] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-colors shadow-2xs"
            />
          </div>

          {/* Filters Modal Trigger */}
          <Button
            size="sm"
            variant={filterCount > 0 ? "secondary" : "outline"}
            onClick={() => setFilterModalOpen(true)}
            className={`h-8.5 px-2.5 text-xs flex items-center gap-1.5 shrink-0 ${
              filterCount > 0
                ? "border-teal-500/40 text-teal-600 dark:text-teal-400 font-semibold"
                : ""
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {filterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </Button>

          {/* Display & Swimlanes Trigger */}
          <Button
            size="sm"
            variant={
              pref.grouping && pref.grouping !== "none"
                ? "secondary"
                : "outline"
            }
            onClick={() => setViewModalOpen(true)}
            className={`h-8.5 px-2.5 text-xs flex items-center gap-1.5 shrink-0 ${
              pref.grouping && pref.grouping !== "none"
                ? "border-teal-500/40 text-teal-600 dark:text-teal-400 font-semibold"
                : ""
            }`}
            title="Swimlanes and board settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="capitalize">
              {pref.grouping && pref.grouping !== "none"
                ? pref.grouping
                : "View"}
            </span>
          </Button>

          {/* Star Board Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              save.mutate({ ...pref, starred: !pref.starred })
            }
            className="h-8.5 px-2 shrink-0"
            title={pref.starred ? "Starred board" : "Star board"}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                pref.starred ? "fill-amber-400 text-amber-500" : "text-slate-400"
              }`}
            />
          </Button>
        </div>

        {/* Active Filter Chips Ribbon on Mobile */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-xs">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-[#132428] text-slate-700 dark:text-slate-200 text-[11px] font-medium shrink-0">
                <span className="truncate max-w-[120px]">"{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterPriority !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium shrink-0 capitalize">
                <span>{filterPriority}</span>
                <button
                  type="button"
                  onClick={() => setFilterPriority("all")}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedAssignee && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-[11px] font-medium shrink-0">
                <span className="truncate max-w-[120px]">
                  {assignees.find((a) => a.user_id === selectedAssignee)
                    ?.display_name || "Assignee"}
                </span>
                <button
                  type="button"
                  onClick={() => setAssignee(null)}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedLabel && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[11px] font-medium shrink-0">
                <span className="truncate max-w-[120px]">
                  {labels.find((l) => l.id === selectedLabel)?.name || "Label"}
                </span>
                <button
                  type="button"
                  onClick={() => setLabel(null)}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 underline font-medium ml-1 shrink-0 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ─── Desktop Toolbar (Screen >= sm) ─── */}
      <div className="hidden sm:flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 w-full">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="w-44 md:w-52">
            <Input
              placeholder="Filter cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-32 md:w-36">
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

          <div className="w-32 md:w-36">
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

          <div className="w-32 md:w-36">
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

          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 h-8.5 px-2.5"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Right: Board Preferences & Views */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            aria-label="Star board"
            onClick={() =>
              save.mutate({ ...pref, starred: !pref.starred })
            }
            className="h-8.5 px-2.5"
          >
            <Star
              size={14}
              className={
                pref.starred ? "fill-amber-400 text-amber-500" : ""
              }
            />
          </Button>

          <CustomSelect
            className="w-36 md:w-40"
            size="sm"
            value={pref.grouping || "none"}
            onChange={(grouping) => save.mutate({ ...pref, grouping })}
            options={["none", "priority", "assignee", "epic"].map((value) => ({
              value,
              label: value === "none" ? "No swimlanes" : `Group by ${value}`,
            }))}
          />

          <CustomSelect
            className="w-32 md:w-36"
            size="sm"
            value={pref.background || "petrol"}
            onChange={(background) => save.mutate({ ...pref, background })}
            options={themeOptions.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
          />

          <CustomSelect
            className="w-32 md:w-36"
            size="sm"
            placeholder="Saved views"
            options={views.map((v) => ({ value: v.id, label: v.name }))}
            onChange={(id) => {
              const view = views.find((v) => v.id === id);
              if (view?.config_json) {
                const config = JSON.parse(view.config_json);
                setSearchQuery(config.search || "");
                setFilterPriority(config.priority || "all");
                setAssignee(config.assignee || null);
                setLabel(config.label || null);
                save.mutate(config);
              }
            }}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => setSaveViewModalOpen(true)}
          >
            <Bookmark size={14} />
            Save view
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setArchiveModalOpen(true)}
            className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400"
          >
            <Archive size={14} />
            Archive
          </Button>
        </div>
      </div>

      {/* ─── Mobile Filters Modal ─── */}
      <Modal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="Filter Cards"
        size="sm"
      >
        <div className="p-4 space-y-4">
          {/* Priority Filter */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Priority
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "all", label: "All" },
                { value: "urgent", label: "🔴 Urgent" },
                { value: "high", label: "🟠 High" },
                { value: "medium", label: "🟡 Medium" },
                { value: "low", label: "🟢 Low" },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFilterPriority(p.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    filterPriority === p.value
                      ? "bg-teal-500 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-[#132428] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee Filter */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Assignee
            </span>
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

          {/* Label Filter */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Label
            </span>
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

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-[#183035]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetFilters();
                setFilterModalOpen(false);
              }}
              className="text-xs text-rose-500 hover:text-rose-600"
            >
              Reset Filters
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setFilterModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Mobile Display & Swimlanes Modal ─── */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Board View & Swimlanes"
        size="sm"
      >
        <div className="p-4 space-y-4">
          {/* Grouping / Swimlanes */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Group by (Swimlanes)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: "none", label: "No swimlanes" },
                { value: "assignee", label: "Assignee" },
                { value: "priority", label: "Priority" },
                { value: "epic", label: "Epic" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => save.mutate({ ...pref, grouping: opt.value })}
                  className={`p-2 rounded-xl text-xs font-medium text-center transition-all ${
                    (pref.grouping || "none") === opt.value
                      ? "bg-teal-500 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-[#132428] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Theme */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Background Theme
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {themeOptions.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => save.mutate({ ...pref, background: t.value })}
                  className={`p-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all border ${
                    (pref.background || "petrol") === t.value
                      ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold"
                      : "border-slate-200/80 dark:border-[#183035] bg-white dark:bg-[#0c181b] text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-white/20"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="truncate">{t.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#183035]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewModalOpen(false);
                setArchiveModalOpen(true);
              }}
              className="w-full justify-center text-xs"
            >
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              Open Archive Center
            </Button>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setViewModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Save View Preset Modal ─── */}
      <Modal
        isOpen={saveViewModalOpen}
        onClose={() => setSaveViewModalOpen(false)}
        title="Save View Preset"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <Input
            placeholder="View name (e.g. My Urgent Tasks)"
            value={newViewName}
            onChange={(e) => {
              setNewViewName(e.target.value);
              if (saveViewError) setSaveViewError("");
            }}
            error={saveViewError || undefined}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSaveViewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveView}
              isLoading={createView.isPending}
            >
              Save View
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Archive Center Modal ─── */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        title="Archive Center"
        size="xl"
      >
        <div className="p-4">
          <ArchiveCenter projectId={projectId} />
        </div>
      </Modal>
    </div>
  );
};
