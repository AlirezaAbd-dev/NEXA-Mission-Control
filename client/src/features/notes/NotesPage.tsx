import { useDeferredValue, useState } from "react";
import { useSearchParams } from "react-router";
import { NotebookPen, Plus, Pin, Trash2, Lock, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useActiveWorkspace } from "@/hooks/workspace/useActiveWorkspace";
import { useNotes, useNote, useCreateNote } from "@/hooks/notes/useNotes";
import { apiError } from "@/lib/apiError";
import { NoteEditor } from "./NoteEditor";
export function NotesPage() {
  const { currentWorkspace, currentWorkspaceId } = useActiveWorkspace();
  const [params, setParams] = useSearchParams();
  const scope = params.get("scope") === "workspace" ? "workspace" : "personal";
  const trash = params.get("trash") === "1";
  const id = params.get("note") || "";
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search);
  const list = useNotes({ scope, workspace_id: scope === "workspace" ? currentWorkspaceId : undefined, trash, q });
  const detail = useNote(id);
  const create = useCreateNote();
  const editable = scope === "personal" || !!currentWorkspace && currentWorkspace.user_role !== "viewer";
  const change = (patch: Record<string, string | null>) => { const next = new URLSearchParams(params); for (const [key, value] of Object.entries(patch)) { if (value === null) next.delete(key); else next.set(key, value); } setParams(next); };
  const sameScope = detail.data && (scope === "personal" ? !detail.data.workspace_id : detail.data.workspace_id === currentWorkspaceId);
  return <div className="min-h-full p-3 sm:p-6 space-y-5 max-w-7xl mx-auto">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><NotebookPen className="text-primary" />Notes</h1><p className="mt-1 text-sm text-muted-foreground">A home for ideas, meeting notes, and the context behind your work.</p></div>
      {!trash && <Button size="sm" disabled={!editable || scope === "workspace" && !currentWorkspaceId} isLoading={create.isPending} onClick={() => create.mutate({ title: "Untitled note", workspace_id: scope === "workspace" ? currentWorkspaceId : undefined }, { onSuccess: n => change({ note: n.id }) })}><Plus size={15} />New note</Button>}
    </header>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant={scope === "personal" ? "secondary" : "ghost"} aria-pressed={scope === "personal"} onClick={() => change({ scope: "personal", note: null })}><Lock size={14} />Personal</Button>
      <Button size="sm" variant={scope === "workspace" ? "secondary" : "ghost"} disabled={!currentWorkspaceId} aria-pressed={scope === "workspace"} onClick={() => change({ scope: "workspace", note: null })}><Users size={14} />{currentWorkspace?.name || "Workspace"}</Button>
      <Button size="sm" variant={trash ? "secondary" : "ghost"} aria-pressed={trash} onClick={() => change({ trash: trash ? null : "1", note: null })}><Trash2 size={14} />Trash</Button>
    </div>
    {scope === "workspace" && !editable && <p className="text-sm text-muted-foreground">Your workspace role allows reading shared notes.</p>}
    {create.error && <p role="alert" className="text-sm text-danger">{apiError(create.error)}</p>}
    <div className="grid min-w-0 items-start gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={(id ? "hidden md:block " : "") + "min-w-0 space-y-3"}>
        <Input aria-label="Search notes" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} maxLength={200} />
        <p className="text-xs text-muted-foreground">{trash ? "Trashed notes" : "Recent notes"} · up to 200 results</p>
        {list.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading notes…</p>}
        {list.error && <div role="alert" className="text-sm text-danger"><p>{apiError(list.error)}</p><Button size="sm" variant="outline" onClick={() => void list.refetch()}>Retry</Button></div>}
        {!list.isLoading && !list.error && !list.data?.length && <p className="p-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground">{search ? "No matching notes." : trash ? "Trash is empty." : "No notes yet. Create your first note to get started."}</p>}
        <div className="space-y-2">{list.data?.map(note => <Button key={note.id} variant={note.id === id ? "secondary" : "ghost"} className="w-full h-auto p-3 justify-start text-start border border-border" onClick={() => change({ note: note.id })}>
          <span className="block min-w-0 w-full"><span className="flex items-start gap-2"><span className="break-words flex-1" dir="auto">{note.title}</span>{note.pinned && <Pin size={13} className="text-primary shrink-0" />}</span><span className="block mt-1 text-[11px] text-muted-foreground">{new Date(note.updated_at).toLocaleDateString()} · {note.author_name || "Former member"}</span></span>
        </Button>)}</div>
      </aside>
      <div className="min-w-0">
        {id && <Button size="sm" variant="ghost" className="md:hidden mb-3" onClick={() => change({ note: null })}><ArrowLeft size={14} />All notes</Button>}
        {!id && <div className="rounded-2xl border border-dashed border-border py-20 px-4 text-center space-y-3"><NotebookPen className="mx-auto text-primary" size={32} /><h2 className="font-semibold">{trash ? "Restore a note" : "Make room for your next idea"}</h2><p className="text-sm text-muted-foreground">{trash ? "Select a note in trash to read or restore it." : "Select a note, or create one. Your personal notes are visible only to you."}</p></div>}
        {id && detail.isLoading && <p role="status" className="p-6 text-sm text-muted-foreground">Loading note…</p>}
        {id && detail.error && <div role="alert" className="p-4 text-sm text-danger"><p>{apiError(detail.error)}</p><Button size="sm" variant="outline" onClick={() => void detail.refetch()}>Retry</Button></div>}
        {id && sameScope && detail.data && <NoteEditor key={detail.data.id} note={detail.data} workspace={currentWorkspaceId} onCreated={note => change({ scope: "personal", note, trash: null })} onTrashed={() => change({ note: null })} />}
        {id && detail.data && !sameScope && <p role="alert" className="p-4 text-sm text-muted-foreground">This note belongs to a different scope. Choose Personal or its workspace to open it.</p>}
      </div>
    </div>
  </div>;
}
