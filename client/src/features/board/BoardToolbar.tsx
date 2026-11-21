import { uiLabel } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
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
  { value: "petrol", get label() { return tr("Petrol Dark"); }, color: "#070e10" },
  { value: "teal", get label() { return tr("Teal Glow"); }, color: "#051c20" },
  { value: "ocean", get label() { return tr("Ocean Blue"); }, color: "#051524" },
  { value: "emerald", get label() { return tr("Emerald Green"); }, color: "#041a14" },
  { value: "sunset", get label() { return tr("Sunset Twilight"); }, color: "#1b0d28" },
  { value: "midnight", get label() { return tr("Midnight Indigo"); }, color: "#0e0f24" },
  { value: "purple", get label() { return tr("Deep Purple"); }, color: "#180a24" },
  { value: "slate", get label() { return tr("Modern Slate"); }, color: "#11171d" },
  { value: "neutral", get label() { return tr("Neutral Minimal"); }, color: "#090b0d" },
];

export const BoardToolbar: React.FC<BoardToolbarProps> = ({ projectId }) => {
  useUiLocale();
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
      setSaveViewError(tr("View name is required"));
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
            <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={tr("Search cards...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 ps-8 pe-2 text-xs rounded-xl bg-white dark:bg-[#0b0c10] border border-slate-200/90 dark:border-white/[0.06] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-colors shadow-2xs"
            />
          </div>

          {/* Filters Modal Trigger */}
          <Button
            size="sm"
            variant={filterCount > 0 ? "secondary" : "outline"}
            onClick={() => setFilterModalOpen(true)}
            className={`h-8.5 px-2.5 text-xs flex items-center gap-1.5 shrink-0 ${
              filterCount > 0
                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                : ""
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{tr("Filters")}</span>
            {filterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
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
                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                : ""
            }`}
            title={tr("Swimlanes and board settings")}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="capitalize">
              {pref.grouping && pref.grouping !== "none"
                ? uiLabel(pref.grouping)
                : tr("View")}
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
            title={pref.starred ? tr("Starred board") : tr("Star board")}
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-[#101117] text-slate-700 dark:text-slate-200 text-[11px] font-medium shrink-0">
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
                <span>{uiLabel(filterPriority)}</span>
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
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium shrink-0">
                <span className="truncate max-w-[120px]">
                  {assignees.find((a) => a.user_id === selectedAssignee)
                    ?.display_name || tr("Assignee")}
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
                  {labels.find((l) => l.id === selectedLabel)?.name || tr("Label")}
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
              className="text-[11px] text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 underline font-medium ms-1 shrink-0 cursor-pointer"
            >{tr("Clear all")}</button>
          </div>
        )}
      </div>

      {/* ─── Desktop Toolbar (Screen >= sm) ─── */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 w-full">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="w-44 md:w-52">
            <Input
              placeholder={tr("Filter cards...")}
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
                { label: tr("All Priorities"), value: "all" },
                { label: tr("Urgent"), value: "urgent" },
                { label: tr("High"), value: "high" },
                { label: tr("Medium"), value: "medium" },
                { label: tr("Low"), value: "low" },
              ]}
            />
          </div>

          <div className="w-32 md:w-36">
            <Select
              placeholder={tr("All assignees")}
              value={selectedAssignee || ""}
              onChange={(v) => setAssignee(v || null)}
              size="sm"
              options={[
                { value: "", label: tr("All assignees") },
                ...assignees.map((a) => ({
                  value: a.user_id,
                  label: a.display_name,
                })),
              ]}
            />
          </div>

          <div className="w-32 md:w-36">
            <Select
              placeholder={tr("All labels")}
              value={selectedLabel || ""}
              onChange={(v) => setLabel(v || null)}
              size="sm"
              options={[
                { value: "", label: tr("All labels") },
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
              <X className="w-3.5 h-3.5 me-1" />{tr("Clear")}</Button>
          )}
        </div>

        {/* Right: Board Preferences & Views */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            aria-label={tr("Star board")}
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
              label: value === "none" ? tr("No swimlanes") : tr("Group by {value0}", { value0: uiLabel(value) }),
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
            placeholder={tr("Saved views")}
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
            <Bookmark size={14} />{tr("Save view")}</Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setArchiveModalOpen(true)}
            className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <Archive size={14} />{tr("Archive")}</Button>
        </div>
      </div>

      {/* ─── Mobile Filters Modal ─── */}
      <Modal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title={tr("Filter Cards")}
        size="sm"
      >
        <div className="p-4 space-y-4">
          {/* Priority Filter */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">{tr("Priority")}</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "all", label: tr("All") },
                { value: "urgent", label: tr("🔴 Urgent") },
                { value: "high", label: tr("🟠 High") },
                { value: "medium", label: tr("🟡 Medium") },
                { value: "low", label: tr("🟢 Low") },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFilterPriority(p.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    filterPriority === p.value
                      ? "bg-emerald-500 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-[#101117] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee Filter */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">{tr("Assignee")}</span>
            <Select
              placeholder={tr("All assignees")}
              value={selectedAssignee || ""}
              onChange={(v) => setAssignee(v || null)}
              size="sm"
              options={[
                { value: "", label: tr("All assignees") },
                ...assignees.map((a) => ({
                  value: a.user_id,
                  label: a.display_name,
                })),
              ]}
            />
          </div>

          {/* Label Filter */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">{tr("Label")}</span>
            <Select
              placeholder={tr("All labels")}
              value={selectedLabel || ""}
              onChange={(v) => setLabel(v || null)}
              size="sm"
              options={[
                { value: "", label: tr("All labels") },
                ...labels.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.06]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetFilters();
                setFilterModalOpen(false);
              }}
              className="text-xs text-rose-500 hover:text-rose-600"
            >{tr("Reset Filters")}</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setFilterModalOpen(false)}
            >{tr("Done")}</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Mobile Display & Swimlanes Modal ─── */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={tr("Board View & Swimlanes")}
        size="sm"
      >
        <div className="p-4 space-y-4">
          {/* Grouping / Swimlanes */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">{tr("Group by (Swimlanes)")}</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: "none", label: tr("No swimlanes") },
                { value: "assignee", label: tr("Assignee") },
                { value: "priority", label: tr("Priority") },
                { value: "epic", label: tr("Epic") },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => save.mutate({ ...pref, grouping: opt.value })}
                  className={`p-2 rounded-xl text-xs font-medium text-center transition-all ${
                    (pref.grouping || "none") === opt.value
                      ? "bg-emerald-500 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-[#101117] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Theme */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">{tr("Background Theme")}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {themeOptions.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => save.mutate({ ...pref, background: t.value })}
                  className={`p-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all border ${
                    (pref.background || "petrol") === t.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
                      : "border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#0b0c10] text-slate-600 dark:text-slate-400"
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
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewModalOpen(false);
                setArchiveModalOpen(true);
              }}
              className="w-full justify-center text-xs"
            >
              <Archive className="w-3.5 h-3.5 me-1.5" />{tr("Open Archive Center")}</Button>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setViewModalOpen(false)}
            >{tr("Done")}</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Save View Preset Modal ─── */}
      <Modal
        isOpen={saveViewModalOpen}
        onClose={() => setSaveViewModalOpen(false)}
        title={tr("Save View Preset")}
        size="sm"
      >
        <div className="p-4 space-y-4">
          <Input
            placeholder={tr("View name (e.g. My Urgent Tasks)")}
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
            >{tr("Cancel")}</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveView}
              isLoading={createView.isPending}
            >{tr("Save View")}</Button>
          </div>
        </div>
      </Modal>

      {/* ─── Archive Center Modal ─── */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        title={tr("Archive Center")}
        size="xl"
      >
        <div className="p-4">
          <ArchiveCenter projectId={projectId} />
        </div>
      </Modal>
    </div>
  );
};
