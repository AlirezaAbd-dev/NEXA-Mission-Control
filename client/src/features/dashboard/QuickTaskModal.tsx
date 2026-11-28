import { tr, useUiLocale } from "@/i18n";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useBoard } from "@/hooks/board/useBoard";
import { cardApi } from "@/lib/api/card.api";
import { apiError } from "@/lib/apiError";
import { useUiStore } from "@/stores/ui.store";
import { Textarea } from "@/components/ui/Textarea";
import { DatePicker } from "@/components/ui/DatePicker";
import { useWorkspaceMembers } from "@/hooks/workspace/useWorkspaceMembers";
import type { Card } from "@/types";
import type { DashboardProject } from "./types";
interface BoardContext {
  projectId: string;
  workspaceId?: string;
  columnId?: string;
  templates: Card[];
  onCreated: (task: Card) => void;
}

export function QuickTaskModal({ projects = [], boardContext, onClose }: { projects?: DashboardProject[]; boardContext?: BoardContext; onClose: () => void }) {
  useUiLocale();
  const [project, setProject] = useState(boardContext?.projectId || projects[0]?.id || "");
  const [column, setColumn] = useState(boardContext?.columnId || "");
  const titleInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("no_priority");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [templateId, setTemplateId] = useState("");
  const template = boardContext?.templates.find(card => card.id === templateId);
  const { data: members = [] } = useWorkspaceMembers(details ? boardContext?.workspaceId : undefined);
  const board = useBoard(project);
  const cache = useQueryClient();
  const open = useUiStore(s => s.openCardModal);
  const columns = [...board.data?.columns || []].sort((a, b) => a.position - b.position);
  const columnId = columns.find(item => item.id === column)?.id || columns.find(c => c.type_ !== "done")?.id || columns[0]?.id || "";
  const save = useMutation({
    meta: { handlesError: true },
    mutationFn: () => cardApi.create({
      project_id: project, column_id: columnId, title: title.trim(),
      description: description.trim() || undefined, priority,
      assignee_ids: assignee ? [assignee] : undefined,
      due_date: dueDate || undefined,
      estimated_hours: template?.estimated_hours ?? undefined,
      story_points: template?.story_points ?? undefined,
      label_ids: template?.labels.map(label => label.id),
    }),
    onSuccess: async task => {
      await cache.invalidateQueries({ predicate: q => ["cards", "boards", "workspaces", "productivity"].includes(String(q.queryKey[0])) });
      onClose();
      if (boardContext) boardContext.onCreated(task);
      else open(task.id);
    },
  });
  return <Modal isOpen onClose={() => { if (!save.isPending) onClose(); }} title={tr("Create task")} description={boardContext ? undefined : tr("Add work to a project in this workspace.")} size="md" initialFocusRef={titleInput}>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (title.trim() && columnId && !save.isPending && !board.error) save.mutate(); }}>
      <Input ref={titleInput} label={tr("Task title")} value={title} onChange={e => setTitle(e.target.value)} maxLength={255} required dir="auto" disabled={save.isPending} />
      {!boardContext && <CustomSelect label={tr("Project")} value={project} onChange={value => { setProject(value); setColumn(""); save.reset(); }} disabled={save.isPending} options={projects.map(p => ({ value: p.id, label: p.name }))} />}
      <CustomSelect label={tr("Column")} value={columnId} onChange={setColumn} disabled={save.isPending || board.isLoading || !!board.error} options={columns.map(c => ({ value: c.id, label: c.name }))} />
      {board.isLoading && <p role="status" className="text-sm text-muted-foreground">{tr("Loading columns…")}</p>}
      {board.error && <div role="alert" className="text-sm text-danger">{apiError(board.error)} <Button size="sm" variant="outline" onClick={() => void board.refetch()}>{tr("Retry")}</Button></div>}
      {!board.isLoading && !board.error && !columns.length && <p className="text-sm text-muted-foreground">{tr("Add a column on the project board first.")}</p>}
      {boardContext && <>
        <Button type="button" variant="ghost" aria-expanded={details} onClick={() => setDetails(value => !value)}>{tr("More details")}</Button>
        {details && <fieldset disabled={save.isPending} className="min-w-0 space-y-3">
          {!!boardContext.templates.length && <CustomSelect searchable label={tr("Task template")} value={templateId} options={[{ value: "", label: tr("None") }, ...boardContext.templates.map(card => ({ value: card.id, label: card.title }))]}
            onChange={id => {
              setTemplateId(id);
              const selected = boardContext.templates.find(card => card.id === id);
              if (!selected) return;
              setTitle(tr("{value0} (Copy)", { value0: selected.title }).slice(0, 255));
              setDescription(selected.description || "");
              setPriority(selected.priority);
            }} />}
          <Textarea label={tr("Description")} rows={3} value={description} onChange={event => setDescription(event.target.value)} />
          <CustomSelect label={tr("Priority")} value={priority} onChange={setPriority} options={[
            { value: "no_priority", label: tr("None") }, { value: "low", label: tr("Low") },
            { value: "medium", label: tr("Medium") }, { value: "high", label: tr("High") }, { value: "urgent", label: tr("Urgent") },
          ]} />
          <CustomSelect searchable label={tr("Assignee")} value={assignee} onChange={setAssignee} options={[
            { value: "", label: tr("Unassigned") }, ...members.map(member => ({ value: member.user_id, label: member.display_name })),
          ]} />
          <DatePicker label={tr("Due date")} value={dueDate} onChange={event => setDueDate(event.target.value)} disabled={save.isPending} />
        </fieldset>}
      </>}
      {save.error && <p role="alert" className="text-sm text-danger">{apiError(save.error)}</p>}
      <div data-dialog-actions className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={save.isPending} onClick={onClose}>{tr("Cancel")}</Button><Button type="submit" disabled={!title.trim() || !columnId || !!board.error || save.isPending} isLoading={save.isPending}>{tr("Create task")}</Button></div>
    </form>
  </Modal>;
}
