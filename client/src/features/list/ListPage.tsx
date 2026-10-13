import { useParams } from "react-router";
import { useCards } from "@/hooks/card/useCards";
import { useBoard } from "@/hooks/board/useBoard";
import { ViewTabs } from "@/features/views/ViewTabs";
import { BoardTableView } from "@/features/views/BoardTableView";
export function ListPage() {
  const { projectId = "" } = useParams();
  const {
    data: cards = [],
    isLoading,
    error,
  } = useCards({ project_id: projectId });
  const { data: board } = useBoard(projectId);
  return (
    <div className="p-4 md:p-6 space-y-5 min-h-full flex-1 flex flex-col">
      <ViewTabs projectId={projectId} />
      {error ? (
        <p role="alert">Could not load tasks. Please retry.</p>
      ) : isLoading || !board ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-[#132428]" />
      ) : (
        <BoardTableView cards={cards} projectId={projectId} board={board} />
      )}
    </div>
  );
}
