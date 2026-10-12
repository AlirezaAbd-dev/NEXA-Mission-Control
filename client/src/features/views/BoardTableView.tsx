import { useProject } from "@/hooks/project/useProject";
import { useWorkspaceMembers } from "@/hooks/workspace/useWorkspaceMembers";
import { useState } from "react";
import type { Board, Card } from "@/types";
import { Button, Input, CustomSelect } from "@/components/ui";
import { Checkbox } from "@/components/ui/Checkbox";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import { useUiStore } from "@/stores/ui.store";
import { priorities } from "./boardDates";
import { useBulkCards } from "@/hooks/enterprise/useBulkCards";
import { LabelBadge } from "@/components/common/LabelBadge";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { apiError } from "@/lib/apiError";
export function BoardTableView({
  cards,
  board,
  projectId,
}: {
  cards: Card[];
  board: Board;
  projectId: string;
}) {
  const { data: project } = useProject(projectId),
    { data: members = [] } = useWorkspaceMembers(project?.workspace_id);
  const update = useUpdateCard(projectId),
    bulk = useBulkCards(projectId),
    open = useUiStore((s) => s.openCardModal);
  const [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("title"),
    [error, setError] = useState(""),
    [archive, setArchive] = useState(false);
  const visible = cards
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "priority"
        ? priorities.indexOf(a.priority) - priorities.indexOf(b.priority)
        : sort === "due_date"
          ? (a.due_date || "9999").localeCompare(b.due_date || "9999")
          : a.title.localeCompare(b.title),
    );
  const save = (id: string, patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate({ ...patch, id }, { onError: (e) => setError(apiError(e)) });
  const toggle = (id: string) =>
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Filter tasks"
          placeholder="Filter tasks by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <CustomSelect
          className="max-w-44"
          value={sort}
          onChange={setSort}
          options={["title", "priority", "due_date"].map((value) => ({
            value,
            label: `Sort by ${value.replace("_", " ")}`,
          }))}
        />
        <span className="text-xs text-slate-500 self-center">
          {visible.length} tasks · {selected.length} selected
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-500">
          {error}
        </p>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-teal-500/10 p-3">
          <CustomSelect
            className="w-48"
            placeholder="Move selected tasks"
            options={board.columns.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(column_id) =>
              bulk.mutate(
                { card_ids: selected, action: "move", value: column_id },
                {
                  onSuccess: () => setSelected([]),
                  onError: (e) => setError(apiError(e)),
                },
              )
            }
          />
          <CustomSelect
            className="w-40"
            placeholder="Set priority"
            options={priorities.map((value) => ({ value, label: value }))}
            onChange={(value) =>
              bulk.mutate(
                { card_ids: selected, action: "priority", value },
                { onError: (e) => setError(apiError(e)) },
              )
            }
          />
          <CustomSelect
            className="w-44"
            placeholder="Assign selected tasks"
            options={members.map((m) => ({
              value: m.user_id,
              label: m.display_name,
            }))}
            onChange={(value) =>
              bulk.mutate(
                { card_ids: selected, action: "assign", value },
                { onError: (e) => setError(apiError(e)) },
              )
            }
          />
          <Button size="sm" variant="outline" onClick={() => setArchive(true)}>
            Archive selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}
      <div className="overflow-auto rounded-xl border border-slate-200 dark:border-[#183035] bg-white dark:bg-[#0d1a1d]">
        <table className="w-full min-w-[960px] text-start text-sm">
          <thead className="bg-slate-50 dark:bg-[#132428] text-xs text-slate-500">
            <tr>
              <th className="p-3">
                <Checkbox
                  aria-label="Select all tasks"
                  checked={
                    visible.length > 0 && selected.length === visible.length
                  }
                  onChange={() =>
                    setSelected(
                      selected.length === visible.length
                        ? []
                        : visible.map((c) => c.id),
                    )
                  }
                />
              </th>
              {[
                "Task",
                "Status",
                "Priority",
                "Points",
                "Assignees",
                "Due date",
                "Labels",
              ].map((s) => (
                <th key={s} className="p-3 font-semibold text-start">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((card) => (
              <tr
                key={card.id}
                className="border-t border-slate-100 dark:border-[#183035]"
              >
                <td className="p-3">
                  <Checkbox
                    aria-label={`Select ${card.title}`}
                    checked={selected.includes(card.id)}
                    onChange={() => toggle(card.id)}
                  />
                </td>
                <td className="p-3 min-w-64">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => open(card.id)}
                    className="text-teal-600 dark:text-teal-400"
                  >
                    Open
                  </Button>
                  <Input
                    aria-label="Task title"
                    key={card.title}
                    defaultValue={card.title}
                    onBlur={(e) => {
                      if (
                        e.target.value.trim() &&
                        e.target.value !== card.title
                      )
                        save(card.id, { id: card.id, title: e.target.value });
                    }}
                  />
                </td>
                <td className="p-3 w-44">
                  <CustomSelect
                    value={card.column_id}
                    options={board.columns.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    onChange={(column_id) =>
                      save(card.id, { id: card.id, column_id })
                    }
                  />
                </td>
                <td className="p-3 w-40">
                  <CustomSelect
                    value={card.priority}
                    options={priorities.map((value) => ({
                      value,
                      label: value.replace("_", " "),
                    }))}
                    onChange={(priority) =>
                      save(card.id, { id: card.id, priority })
                    }
                  />
                </td>
                <td className="p-3 w-24">
                  <Input
                    aria-label="Story points"
                    type="number"
                    min="0"
                    key={card.story_points}
                    defaultValue={card.story_points ?? ""}
                    onBlur={(e) =>
                      save(card.id, {
                        id: card.id,
                        story_points: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </td>
                <td className="p-3 text-xs">
                  {card.assignees.map((a) => a.display_name).join(", ") ||
                    "Unassigned"}
                </td>
                <td className="p-3">
                  <Input
                    aria-label="Due date"
                    type="date"
                    value={card.due_date?.slice(0, 10) || ""}
                    onChange={(e) =>
                      save(card.id, { id: card.id, due_date: e.target.value })
                    }
                  />
                </td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {card.labels.map((l) => (
                      <LabelBadge key={l.id} name={l.name} color={l.color} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-10 text-center text-slate-500">
            No matching tasks. Add a task on the board or adjust your filter.
          </p>
        )}
      </div>
      <ConfirmModal
        isOpen={archive}
        onClose={() => setArchive(false)}
        title="Archive selected tasks?"
        description="You can restore these tasks in Project settings."
        confirmLabel="Archive"
        onConfirm={() =>
          bulk.mutate(
            { card_ids: selected, action: "archive" },
            {
              onSuccess: () => {
                setSelected([]);
                setArchive(false);
              },
              onError: (e) => setError(apiError(e)),
            },
          )
        }
        isLoading={bulk.isPending}
      />
    </div>
  );
}
