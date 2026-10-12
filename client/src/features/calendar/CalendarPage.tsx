import { useParams } from "react-router";
import { useCards } from "@/hooks/card/useCards";
import { useBoard } from "@/hooks/board/useBoard";
import { usePreferences } from "@/hooks/enterprise/usePreferences";
import { ViewTabs } from "@/features/views/ViewTabs";
import { BoardCalendarView } from "@/features/views/BoardCalendarView";
import { boardThemes } from "@/features/board/BoardPage";

export function CalendarPage() {
  const { projectId = "" } = useParams();
  const {
    data: cards = [],
    isLoading,
    error,
  } = useCards({ project_id: projectId });
  const { data: board } = useBoard(projectId);
  const { data: preferences = {} } = usePreferences(projectId);

  return (
    <div
      className={`min-h-full p-4 md:p-6 space-y-5 transition-colors duration-300 ${boardThemes[preferences.background || "petrol"] || boardThemes.petrol}`}
    >
      <ViewTabs projectId={projectId} />
      {error ? (
        <p role="alert" className="text-rose-500 font-semibold text-sm">
          Could not load tasks. Please retry.
        </p>
      ) : isLoading || !board ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/50 dark:bg-[#132428]/60" />
      ) : (
        <BoardCalendarView cards={cards} projectId={projectId} />
      )}
    </div>
  );
}
