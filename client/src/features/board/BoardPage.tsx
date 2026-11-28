import { tr, useUiLocale } from "@/i18n";
import React, { useState } from "react";
import { useParams } from "react-router";
import { MirroredTasks } from "@/features/productivity/MirroredTasks";
import { ViewTabs } from "@/features/views/ViewTabs";
import { KanbanBoard } from "./KanbanBoard";
import { BoardToolbar } from "./BoardToolbar";
import { useBoard } from "@/hooks/board/useBoard";
import { useCards } from "@/hooks/card/useCards";
import { usePreferences } from "@/hooks/enterprise/usePreferences";
import { EmptyState } from "@/components/common/EmptyState";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useProject } from "@/hooks/project/useProject";
import { useUiStore } from "@/stores/ui.store";
import { QuickTaskModal } from "@/features/dashboard/QuickTaskModal";
import type { Card } from "@/types";
import { ColumnOrderModal } from "./ColumnOrderModal";

export const boardThemes: Record<string, string> = {
  petrol: "bg-[var(--nexa-surface-l0)]",
  teal: "bg-[var(--nexa-surface-l0)]",
  ocean: "bg-[var(--nexa-surface-l0)]",
  emerald: "bg-[var(--nexa-surface-l0)]",
  sunset: "bg-[var(--nexa-surface-l0)]",
  midnight: "bg-[var(--nexa-surface-l0)]",
  purple: "bg-[var(--nexa-surface-l0)]",
  slate: "bg-[var(--nexa-surface-l0)]",
  neutral: "bg-[var(--nexa-surface-l0)]",
};

export const BoardPage: React.FC = () => {
  useUiLocale();
  const { projectId } = useParams<{ projectId: string }>();
  const [orderOpen, setOrderOpen] = useState(false);
  const [mirrorsOpen, setMirrorsOpen] = useState(false);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [createdTask, setCreatedTask] = useState<Card | null>(null);
  const openCard = useUiStore(state => state.openCardModal);
  const { data: project } = useProject(projectId);

  const { data: board, isLoading: isBoardLoading } = useBoard(projectId || "");
  const { data: preferences = {} } = usePreferences(projectId || "");
  const { data: cards = [], isLoading: isCardsLoading } = useCards({
    project_id: projectId || "",
  });

  if (!projectId) {
    return (
      <div className="p-8 text-center text-slate-500">{tr("No project selected.")}</div>
    );
  }

  if (isBoardLoading || isCardsLoading) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">{tr("Loading board...")}</div>
    );
  }

  if (!board) {
    return (
      <EmptyState
        icon={<LayoutGrid className="w-6 h-6 text-emerald-500" />}
        title={tr("Board not found")}
        description={tr("Could not load the board for this project.")}
      />
    );
  }

  return (
    <div
      className={`h-full flex flex-col p-2.5 sm:p-5 md:p-6 space-y-2.5 sm:space-y-4 overflow-hidden min-w-0 transition-colors duration-300 ${boardThemes[preferences.background || "petrol"] || boardThemes.petrol}`}
    >
      <ViewTabs projectId={projectId} />
      <BoardToolbar projectId={projectId} onAdd={() => setAddTo("")}
        onOrder={board.columns.length > 1 ? () => setOrderOpen(true) : undefined}
        onMirror={() => setMirrorsOpen(true)}
        mirrorShortcut={<MirroredTasks projectId={projectId} isOpen={mirrorsOpen} onOpen={() => setMirrorsOpen(true)} onClose={() => setMirrorsOpen(false)} />} />
      {addTo !== null && <QuickTaskModal boardContext={{ projectId, workspaceId: project?.workspace_id, columnId: addTo, templates: cards.filter(card => card.is_template), onCreated: setCreatedTask }}
        onClose={() => setAddTo(null)} />}
      {createdTask && createdTask.project_id === projectId && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-1 text-sm">
        <span role="status">{tr("Task added.")}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => openCard(createdTask.id)}>{tr("Open task")}</Button>
        <Button type="button" variant="ghost" size="sm" className="ms-auto" onClick={() => setCreatedTask(null)}>{tr("Dismiss")}</Button>
      </div>}
      {orderOpen && <ColumnOrderModal columns={board.columns} boardId={board.id} projectId={projectId} onClose={() => setOrderOpen(false)} />}
      {/* Kanban Board canvas */}
      <KanbanBoard key={projectId} board={board} cards={cards} projectId={projectId} onAdd={setAddTo} createdTask={createdTask?.project_id === projectId ? createdTask : null} />
    </div>
  );
};
