import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useBoard } from "@/hooks/board/useBoard";
import { cardApi } from "@/lib/api/card.api";
import { apiError } from "@/lib/apiError";
import { useUiStore } from "@/stores/ui.store";
import type { DashboardProject } from "./types";
export function QuickTaskModal({ projects, onClose }: { projects: DashboardProject[]; onClose: () => void }) {
  const [project, setProject] = useState(projects[0]?.id || "");
  const [column, setColumn] = useState("");
  const [title, setTitle] = useState("");
  const board = useBoard(project);
  const cache = useQueryClient();
  const open = useUiStore(s => s.openCardModal);
  const columns = [...board.data?.columns || []].sort((a, b) => a.position - b.position);
  const columnId = column || columns.find(c => c.type_ !== "done")?.id || columns[0]?.id || "";
  const save = useMutation({ meta: { handlesError: true }, mutationFn: () => cardApi.create({ project_id: project, column_id: columnId, title: title.trim() }), onSuccess: async task => { await cache.invalidateQueries({ predicate: q => ["cards", "boards", "workspaces", "productivity"].includes(String(q.queryKey[0])) }); onClose(); open(task.id); } });
  return <Modal isOpen onClose={() => { if (!save.isPending) onClose(); }} title="Create task" description="Add work to a project in this workspace." size="md">
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (title.trim() && columnId && !save.isPending && !board.error) save.mutate(); }}>
      <Input label="Task title" value={title} onChange={e => setTitle(e.target.value)} maxLength={255} required dir="auto" disabled={save.isPending} />
      <CustomSelect label="Project" value={project} onChange={value => { setProject(value); setColumn(""); save.reset(); }} disabled={save.isPending} options={projects.map(p => ({ value: p.id, label: p.name }))} />
      <CustomSelect label="Column" value={columnId} onChange={setColumn} disabled={save.isPending || board.isLoading || !!board.error} options={columns.map(c => ({ value: c.id, label: c.name }))} />
      {board.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading columns…</p>}
      {board.error && <div role="alert" className="text-sm text-danger">{apiError(board.error)} <Button size="sm" variant="outline" onClick={() => void board.refetch()}>Retry</Button></div>}
      {!board.isLoading && !board.error && !columns.length && <p className="text-sm text-muted-foreground">Add a column on the project board first.</p>}
      {save.error && <p role="alert" className="text-sm text-danger">{apiError(save.error)}</p>}
      <div className="flex justify-end gap-2"><Button variant="ghost" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={!title.trim() || !columnId || !!board.error || save.isPending} isLoading={save.isPending}>Create task</Button></div>
    </form>
  </Modal>;
}
