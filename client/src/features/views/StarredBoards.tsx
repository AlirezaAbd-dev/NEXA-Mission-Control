import { NavLink } from "react-router";
import { Star } from "lucide-react";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
export function StarredBoards({ projectId }: { projectId: string }) {
  const { data: boards = [] } = useEnterpriseResource<
    { id: string; name: string }[]
  >(projectId, "starred");
  if (!boards.length) return null;
  return (
    <section className="space-y-1">
      <h2 className="text-[11px] font-bold uppercase text-slate-500 px-2">
        Starred boards
      </h2>
      {boards.map((board) => (
        <NavLink
          key={board.id}
          to={`/p/${board.id}/board`}
          className="flex items-center gap-2 p-2 text-xs text-slate-600 dark:text-slate-300 rounded-lg hover:bg-teal-500/10"
        >
          <Star size={12} className="fill-amber-400 text-amber-500" />
          {board.name}
        </NavLink>
      ))}
    </section>
  );
}
