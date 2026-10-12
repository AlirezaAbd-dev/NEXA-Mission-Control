import React from "react";
import { MirroredTasks } from "@/features/productivity/MirroredTasks";
import { BoardPreferences } from "@/features/views/BoardPreferences";
import { ViewTabs } from "@/features/views/ViewTabs";
import { useParams } from "react-router";
import { KanbanBoard } from "./KanbanBoard";
import { BoardFilters } from "./BoardFilters";
import { useBoard } from "@/hooks/board/useBoard";
import { useCards } from "@/hooks/card/useCards";
import { usePreferences } from "@/hooks/enterprise/usePreferences";
import { EmptyState } from "@/components/common/EmptyState";
import { LayoutGrid } from "lucide-react";

const boardThemes: Record<string, string> = {
  petrol: "bg-slate-50 dark:bg-[#070e10]",
  teal: "bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-slate-50 dark:from-[#051c20] dark:via-[#07191d] dark:to-[#070e10]",
  sunset:
    "bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-orange-500/5 dark:from-[#1b0d28] dark:via-[#170c1e] dark:to-[#081216]",
  neutral: "bg-slate-100/70 dark:bg-[#090b0d]",
};

export const BoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: board, isLoading: isBoardLoading } = useBoard(projectId || "");
  const { data: preferences = {} } = usePreferences(projectId || "");
  const { data: cards = [], isLoading: isCardsLoading } = useCards({
    project_id: projectId || "",
  });

  if (!projectId) {
    return (
      <div className="p-8 text-center text-slate-500">No project selected.</div>
    );
  }

  if (isBoardLoading || isCardsLoading) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">
        Loading board...
      </div>
    );
  }

  if (!board) {
    return (
      <EmptyState
        icon={<LayoutGrid className="w-6 h-6 text-teal-500" />}
        title="Board not found"
        description="Could not load the board for this project."
      />
    );
  }

  return (
    <div
      className={`h-full flex flex-col p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4 overflow-hidden min-w-0 transition-colors duration-300 ${boardThemes[preferences.background || "petrol"] || boardThemes.petrol}`}
    >
      <ViewTabs projectId={projectId} />
      {/* Top action bar: Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 pb-1 shrink-0">
        <BoardFilters />
        <BoardPreferences projectId={projectId} />
      </div>

      <MirroredTasks projectId={projectId} />
      {/* Kanban Board canvas */}
      <KanbanBoard board={board} cards={cards} projectId={projectId} />
    </div>
  );
};
