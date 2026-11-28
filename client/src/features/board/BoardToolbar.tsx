import { formatNumber, uiLabel } from "@/i18n";
import type { ReactNode } from "react";
import { tr, useUiLocale } from "@/i18n";
import React, { useState } from "react";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Star,
  X,
  Bookmark,
  Archive,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { Button, Input, Select, CustomSelect, Modal, Dropdown } from "@/components/ui";
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
  onAdd: () => void;
  onOrder?: () => void;
  onMirror: () => void;
  mirrorShortcut?: ReactNode;
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

export const BoardToolbar: React.FC<BoardToolbarProps> = ({ projectId, onAdd, onOrder, onMirror, mirrorShortcut }) => {
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
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
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

  const filterChips = [
    filterPriority !== "all" && { label: uiLabel(filterPriority), remove: () => setFilterPriority("all") },
    selectedAssignee && { label: assignees.find(item => item.user_id === selectedAssignee)?.display_name || tr("Assignee"), remove: () => setAssignee(null) },
    selectedLabel && { label: labels.find(item => item.id === selectedLabel)?.name || tr("Label"), remove: () => setLabel(null) },
  ].filter(item => !!item);
  return (
    <div className="min-w-0 shrink-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 basis-full sm:min-w-40 sm:flex-1"><Input icon={Search} className="w-full min-h-11"
          aria-label={tr("Search tasks...")} placeholder={tr("Search tasks...")} value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)} /></div>
        <Button type="button" variant={filterCount ? "secondary" : "outline"} size="sm" onClick={() => setFilterModalOpen(true)}>
          <Filter size={15} aria-hidden="true" />{tr("Filters")}{filterCount ? ` (${formatNumber(filterCount)})` : ""}
        </Button>
        <Button type="button" variant="outline" size="sm" aria-label={tr("Saved views")} title={tr("Saved views")} onClick={() => { setSaveViewError(""); setSavedViewsOpen(true); }}>
          <Bookmark size={15} aria-hidden="true" /><span className="hidden min-[380px]:inline">{tr("Saved views")}</span>
        </Button>
        {mirrorShortcut}
        <Dropdown ariaLabel={tr("Board actions")} trigger={<MoreHorizontal size={18} aria-hidden="true" />} items={[
          { id: "display", label: tr("Board View & Swimlanes"), icon: <SlidersHorizontal size={15} />, onClick: () => setViewModalOpen(true) },
          { id: "mirror", label: tr("Mirrored tasks"), onClick: onMirror },
          ...(onOrder ? [{ id: "order", label: tr("Reorder columns"), onClick: onOrder }] : []),
          { id: "star", label: pref.starred ? tr("Unstar board") : tr("Star board"), icon: <Star size={15} />, onClick: () => save.mutate({ ...pref, starred: !pref.starred }) },
          { id: "archive", label: tr("Archive"), icon: <Archive size={15} />, onClick: () => setArchiveModalOpen(true) },
        ]} />
        <Button type="button" size="sm" className="ms-auto" onClick={onAdd}><Plus size={15} aria-hidden="true" />{tr("Add task")}</Button>
      </div>
      {!!filterChips.length && <div className="flex flex-wrap gap-1.5">
        {filterChips.map((item, index) => <Button key={index} type="button" variant="secondary" size="sm" className="max-w-full"
          aria-label={tr("Remove filter: {value0}", { value0: item.label })} onClick={item.remove}>
          <span className="truncate" dir="auto">{item.label}</span><X size={13} aria-hidden="true" />
        </Button>)}
      </div>}
      <Modal isOpen={savedViewsOpen} onClose={() => setSavedViewsOpen(false)} title={tr("Saved views")} size="sm">
        <div className="space-y-3">
          {views.length ? <CustomSelect label={tr("Saved views")} options={views.map(view => ({ value: view.id, label: view.name }))}
            onChange={id => {
              const view = views.find(item => item.id === id);
              if (!view?.config_json) return;
              try {
                const config = JSON.parse(view.config_json);
                setSearchQuery(config.search || "");
                setFilterPriority(config.priority || "all");
                setAssignee(config.assignee || null);
                setLabel(config.label || null);
                save.mutate(config);
                setSavedViewsOpen(false);
              } catch {
                setSaveViewError(tr("Could not open saved view."));
              }
            }} /> : <p className="text-sm text-muted-foreground">{tr("No saved views yet.")}</p>}
          {saveViewError && <p role="alert" className="text-sm text-danger">{saveViewError}</p>}
          <Button type="button" variant="outline" onClick={() => { setSavedViewsOpen(false); setSaveViewError(""); setSaveViewModalOpen(true); }}>{tr("Save view")}</Button>
        </div>
      </Modal>

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
            <span className="text-xs font-semibold text-foreground block">{tr("Priority")}</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: "all", label: tr("All") },
                { value: "urgent", label: tr("Urgent") },
                { value: "high", label: tr("High") },
                { value: "medium", label: tr("Medium") },
                { value: "low", label: tr("Low") },
              ].map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  onClick={() => setFilterPriority(p.value)}
                  variant="ghost" aria-pressed={filterPriority === p.value}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    filterPriority === p.value
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-[var(--nexa-surface-l2)] text-foreground hover:bg-[var(--nexa-surface-l3)]"
                  }`}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Assignee Filter */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">{tr("Assignee")}</span>
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
            <span className="text-xs font-semibold text-foreground block">{tr("Label")}</span>
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
          <div className="pt-2 flex items-center justify-between border-t border-[var(--nexa-divider)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetFilters();
                setFilterModalOpen(false);
              }}
              className="text-xs text-danger hover:text-danger"
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
            <span className="text-xs font-semibold text-foreground block">{tr("Group by (Swimlanes)")}</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { value: "none", label: tr("No swimlanes") },
                { value: "assignee", label: tr("Assignee") },
                { value: "priority", label: tr("Priority") },
                { value: "epic", label: tr("Epic") },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  type="button" variant="ghost" aria-pressed={(pref.grouping || "none") === opt.value} onClick={() => save.mutate({ ...pref, grouping: opt.value })}
                  className={`p-2 rounded-xl text-xs font-medium text-center transition-all ${
                    (pref.grouping || "none") === opt.value
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-[var(--nexa-surface-l2)] text-foreground hover:bg-[var(--nexa-surface-l3)]"
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Background Theme */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground block">{tr("Background Theme")}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {themeOptions.map((t) => (
                <Button
                  key={t.value}
                  type="button" variant="ghost" aria-pressed={(pref.background || "petrol") === t.value} onClick={() => save.mutate({ ...pref, background: t.value })}
                  className={`h-auto min-h-11 p-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all border ${
                    (pref.background || "petrol") === t.value
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-[var(--nexa-divider)] bg-[var(--nexa-surface-l1)] text-muted-foreground"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-white/20"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="break-words">{t.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-2 border-t border-[var(--nexa-divider)]">
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
