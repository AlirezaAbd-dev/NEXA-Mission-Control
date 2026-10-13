import React from "react";
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

export const boardThemes: Record<string, string> = {
  petrol: "bg-slate-50 dark:bg-[#070e10]",
  teal: "bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-slate-50 dark:from-[#051c20] dark:via-[#07191d] dark:to-[#070e10]",
  ocean: "bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-slate-50 dark:from-[#051524] dark:via-[#071320] dark:to-[#050b12]",
  emerald: "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 dark:from-[#041a14] dark:via-[#061512] dark:to-[#050e0c]",
  sunset:
    "bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-orange-500/5 dark:from-[#1b0d28] dark:via-[#170c1e] dark:to-[#081216]",
  midnight: "bg-gradient-to-br from-indigo-500/10 via-slate-500/5 to-slate-50 dark:from-[#0e0f24] dark:via-[#090b17] dark:to-[#05060d]",
  purple: "bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-slate-50 dark:from-[#180a24] dark:via-[#12081c] dark:to-[#07040b]",
  slate: "bg-gradient-to-br from-slate-400/10 via-slate-300/5 to-slate-50 dark:from-[#11171d] dark:via-[#0d1217] dark:to-[#080b0e]",
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
      className={`h-full flex flex-col p-2.5 sm:p-5 md:p-6 space-y-2.5 sm:space-y-4 overflow-hidden min-w-0 transition-colors duration-300 ${boardThemes[preferences.background || "petrol"] || boardThemes.petrol}`}
    >
      <ViewTabs projectId={projectId} />
      {/* Top action bar: Filters & Display */}
      <BoardToolbar projectId={projectId} />

      <MirroredTasks projectId={projectId} />
      {/* Kanban Board canvas */}
      <KanbanBoard board={board} cards={cards} projectId={projectId} />
    </div>
  );
};
