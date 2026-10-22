import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Lock, Users, Plus, Link2, Unlink, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useNotes, useCreateNote } from "@/hooks/notes/useNotes";
import { useProject } from "@/hooks/project/useProject";
import { useWorkspaces } from "@/hooks/workspace/useWorkspaces";
import { useUiStore } from "@/stores/ui.store";
import { notesApi } from "@/lib/api/notes.api";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { apiError } from "@/lib/apiError";
import type { Card } from "@/types";
import type { Note } from "@/features/notes/types";

export function CardNotes({ card }: { card: Card }) {
  const navigate = useNavigate();
  const close = useUiStore(s => s.closeCardModal);
  const cache = useQueryClient();
  const project = useProject(card.project_id);
  const workspaces = useWorkspaces();
  const workspace = workspaces.data?.find(w => w.id === project.data?.workspace_id);
  const [mode, setMode] = useState<"attach" | "create" | null>(null);
  const [scope, setScope] = useState("personal");
  const [selected, setSelected] = useState("");
  const [title, setTitle] = useState("");
  const linked = useNotes({ scope: "all", card_id: card.id, trash: false });
  const candidates = useNotes({ scope: "all", trash: false }, mode === "attach");
  const create = useCreateNote();
  const change = useMutation({
    meta: { handlesError: true },
    mutationFn: ({ id, remove }: { id: string; remove?: boolean }) => remove ? notesApi.unlink(id, card.id) : notesApi.link(id, card.id),
    onSuccess: async () => { setSelected(""); await cache.invalidateQueries({ queryKey: QUERY_KEYS.notes.all }); },
  });
  const open = (note: Note) => {
    const params = new URLSearchParams({ scope: note.workspace_id ? "workspace" : "personal", note: note.id });
    navigate((note.workspace_id ? "/w/" + note.workspace_id : "") + "/notes?" + params);
    close();
  };
  const busy = change.isPending || create.isPending;
  const canShare = !!workspace && workspace.user_role !== "viewer";
  const available = candidates.data?.filter(n => n.can_edit && (!n.workspace_id || n.workspace_id === project.data?.workspace_id) && !linked.data?.some(l => l.id === n.id)) || [];
  const setModeSafe = (next: typeof mode) => { setMode(next); change.reset(); create.reset(); setSelected(""); };

  return <section className="space-y-3 border-t border-border pt-5" aria-label="Linked notes">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><NotebookPen size={16} className="text-primary" />Linked notes{linked.data ? " · " + linked.data.length : ""}</h3>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={busy} aria-expanded={mode === "attach"} onClick={() => setModeSafe(mode === "attach" ? null : "attach")}><Link2 size={14} />Attach note</Button>
        <Button size="sm" variant="outline" disabled={busy} aria-expanded={mode === "create"} onClick={() => setModeSafe(mode === "create" ? null : "create")}><Plus size={14} />Create note</Button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Private notes are visible only to you. Shared notes follow workspace access. Notes in trash stay linked and return here when restored.</p>
    {linked.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading linked notes…</p>}
    {linked.error && <div role="alert" className="text-sm text-danger">{apiError(linked.error)} <Button size="sm" variant="outline" onClick={() => void linked.refetch()}>Retry</Button></div>}
    {linked.data?.length === 0 && <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">No linked notes yet. Attach context or create a note for this task.</p>}
    {linked.data?.map(note => <div key={note.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
      <span className="text-primary shrink-0">{note.workspace_id ? <Users size={15} aria-label="Workspace note" /> : <Lock size={15} aria-label="Personal note" />}</span>
      <Button variant="ghost" size="sm" className="min-w-0 flex-1 h-auto text-start justify-start whitespace-normal" onClick={() => open(note)}><span className="min-w-0"><span dir="auto" className="block break-words">{note.title}</span><span className="block text-xs text-muted-foreground">{note.workspace_name || "Personal · only you"}</span></span><ExternalLink size={13} className="shrink-0" /></Button>
      {note.can_edit && <Button variant="ghost" size="icon" disabled={busy} aria-label={"Unlink note: " + note.title} title="Remove link; keep note and task" onClick={() => change.mutate({ id: note.id, remove: true })}><Unlink size={14} /></Button>}
    </div>)}
    {mode === "attach" && <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-3">
      <CustomSelect label="Existing note" searchable disabled={busy || candidates.isLoading || !!candidates.error || linked.isLoading || !!linked.error} value={selected} onChange={setSelected} options={available.map(n => ({ value: n.id, label: n.title, description: n.workspace_name || "Personal · only you" }))} />
      <p className="text-xs text-muted-foreground">Choose a personal note or an editable note in this task’s workspace. Search shows up to 200 recent notes.</p>
      {candidates.isLoading && <p role="status" className="text-sm">Loading notes…</p>}
      {candidates.error && <div role="alert" className="text-sm text-danger">{apiError(candidates.error)} <Button size="sm" variant="outline" onClick={() => void candidates.refetch()}>Retry</Button></div>}
      {!candidates.isLoading && !candidates.error && !available.length && <p className="text-sm text-muted-foreground">No available notes. Create one to get started.</p>}
      <Button size="sm" disabled={!selected || busy || !!linked.error} isLoading={change.isPending} onClick={() => change.mutate({ id: selected })}>Attach selected note</Button>
    </div>}
    {mode === "create" && <form className="rounded-xl bg-muted/30 border border-border p-3 space-y-3" onSubmit={event => { event.preventDefault(); if (busy || !title.trim() || scope === "workspace" && !canShare) return; create.mutate({ title: title.trim(), card_id: card.id, workspace_id: scope === "workspace" ? workspace?.id : undefined }, { onSuccess: open }); }}>
      <Input label="Note title" value={title} maxLength={160} dir="auto" onChange={e => setTitle(e.target.value)} placeholder="e.g. Decisions and next steps" required />
      <CustomSelect label="Visibility" value={scope} onChange={setScope} disabled={busy} options={[{ value: "personal", label: "Personal · only you" }, ...(canShare ? [{ value: "workspace", label: "Shared · " + workspace.name }] : [])]} />
      <p className="text-xs text-muted-foreground">The note and task link are saved together. Continue writing in Notes after creation.</p>
      <Button size="sm" type="submit" disabled={!title.trim() || busy || scope === "workspace" && !canShare} isLoading={create.isPending}>Create and open note</Button>
    </form>}
    {(change.error || create.error) && <p role="alert" className="text-sm text-danger">{apiError(change.error || create.error)}</p>}
  </section>;
}
