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
import { ArrowLeftRight, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
      {/* Top action bar: Filters & Display */}
      <BoardToolbar projectId={projectId} />

      <MirroredTasks
        projectId={projectId}
        actions={
          <Button size="sm" variant="outline" onClick={() => setOrderOpen(true)} disabled={board.columns.length < 2}>
            <ArrowLeftRight size={14} />{tr("Reorder columns")}</Button>
        }
      />
      {orderOpen && <ColumnOrderModal columns={board.columns} boardId={board.id} projectId={projectId} onClose={() => setOrderOpen(false)} />}
      {/* Kanban Board canvas */}
      <KanbanBoard board={board} cards={cards} projectId={projectId} />
    </div>
  );
};
