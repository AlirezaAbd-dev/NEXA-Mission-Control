import { dateLocale } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { Pin, Trash2, Undo2, Lock, Users, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useNoteDraft } from "@/hooks/notes/useNoteDraft";
import { useNote, useCreateNote } from "@/hooks/notes/useNotes";
import { apiError } from "@/lib/apiError";
import { NoteTaskLinks } from "./NoteTaskLinks";
import type { Note } from "./types";
export function NoteEditor({ note, workspace, onCreated, onTrashed }: { note: Note; workspace: string; onCreated: (id: string) => void; onTrashed: () => void }) {
  useUiLocale();
  const draft = useNoteDraft(note);
  const query = useNote(note.id);
  const copy = useCreateNote();
  const [confirm, setConfirm] = useState<"trash" | "reload" | null>(null);
  const [actionError, setActionError] = useState("");
  const readOnly = !note.can_edit || !!note.deleted_at;
  const busy = draft.dirty || draft.pending;
  const action = (data: { pinned?: boolean; trashed?: boolean }) => {
    setActionError("");
    draft.update.mutate({ version: draft.base.version, ...data }, {
      onSuccess: saved => { draft.reset(saved); setConfirm(null); if (data.trashed !== undefined) onTrashed(); },
      onError: error => setActionError(apiError(error)),
    });
  };
  return <article className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">{note.workspace_id ? <Users size={14} /> : <Lock size={14} />} {note.workspace_id ? tr("Shared ·") + (note.workspace_name || tr("Workspace")) : tr("Private · only you")}
        <span role="status">{draft.pending ? tr("Saving…") : draft.saveError ? tr("Not saved") : draft.dirty ? tr("Unsaved changes") : <span className="inline-flex items-center gap-1"><Check size={12} />{tr("Saved")}</span>}</span>
      </span>
      <div className="flex flex-wrap gap-2">
        {note.can_edit && !note.deleted_at && <><Button variant={draft.base.pinned ? "secondary" : "ghost"} size="sm" disabled={busy} aria-pressed={draft.base.pinned} onClick={() => action({ pinned: !draft.base.pinned })}><Pin size={14} />{draft.base.pinned ? tr("Unpin") : tr("Pin")}</Button><Button variant="ghost" size="sm" className="text-danger hover:text-danger dark:text-danger dark:hover:text-danger" disabled={busy} onClick={() => setConfirm("trash")}><Trash2 size={14} />{tr("Move to trash")}</Button></>}
        {note.can_edit && note.deleted_at && <Button variant="outline" size="sm" disabled={draft.pending} onClick={() => action({ trashed: false })}><Undo2 size={14} />{tr("Restore note")}</Button>}
      </div>
    </div>
    {note.deleted_at && <p className="rounded-xl bg-muted p-3 text-sm">{tr("This note is in trash. Restore it to continue editing.")}</p>}
    {!note.can_edit && <p className="text-sm text-muted-foreground">{tr("You have read-only access to workspace notes.")}</p>}
    <Input aria-label={tr("Note title")} value={draft.title} maxLength={160} readOnly={readOnly} onChange={event => draft.setTitle(event.target.value)} className="text-lg font-semibold" dir="auto" />
    {!draft.title.trim() && <p role="alert" className="text-xs text-danger">{tr("Add a title to save your changes.")}</p>}
    <RichTextEditor ariaLabel={tr("Note body")} content={draft.body} onChange={draft.setBody} editable={!readOnly} minHeight="300px" placeholder={tr("Capture an idea, write meeting notes, or plan your next step…")} />
    {(!!draft.saveError || !!actionError) && <div role="alert" className="space-y-3 rounded-xl border border-danger/30 p-3 text-sm">
      <p>{draft.saveError ? apiError(draft.saveError) : actionError}</p>
      <div className="flex flex-wrap gap-2">
        {!!draft.saveError && <Button size="sm" variant="outline" onClick={draft.retry}>{tr("Retry save")}</Button>}
        <Button size="sm" variant="outline" onClick={() => setConfirm("reload")}>{tr("Reload latest")}</Button>
        <Button size="sm" variant="secondary" isLoading={copy.isPending} onClick={() => copy.mutate({ title: (draft.title.trim() || "Untitled note").slice(0, 150) + " (copy)", body: draft.body }, { onSuccess: n => { draft.allowNavigation(); onCreated(n.id); }, onError: error => setActionError(apiError(error)) })}><Copy size={14} />{tr("Save personal copy")}</Button>
      </div>
    </div>}
    <p className="text-xs text-muted-foreground">{tr("Updated")}{" "}{new Date(draft.base.updated_at).toLocaleString(dateLocale())} · {note.author_name || tr("Former member")}</p>
    <NoteTaskLinks id={note.id} workspace={note.workspace_id || workspace} disabled={busy} readOnly={readOnly} />
    <ConfirmModal isOpen={confirm === "trash"} onClose={() => { if (!draft.pending) { setConfirm(null); setActionError(""); } }} title={tr("Move note to trash?")} description={"“" + draft.title + tr("” can be restored from Notes → Trash. Linked tasks will stay unchanged.")} confirmLabel={tr("Move to trash")} isDestructive isLoading={draft.pending} error={actionError} onConfirm={() => action({ trashed: true })} />
    <ConfirmModal isOpen={confirm === "reload"} onClose={() => setConfirm(null)} title={tr("Discard your draft and reload?")} description={tr("Your unsaved text will be replaced by the latest saved version. Use Save personal copy first if you want to keep your draft.")} confirmLabel={tr("Reload latest")} isDestructive onConfirm={() => { void query.refetch().then(result => { if (result.data) { draft.reset(result.data); setConfirm(null); setActionError(""); } }); }} />
    <ConfirmModal isOpen={draft.blocker.state === "blocked"} onClose={() => { if (draft.blocker.state === "blocked") draft.blocker.reset(); }} title={draft.pending ? tr("Saving note…") : tr("Unsaved note changes")} description={tr("Your latest changes have not been saved yet. Stay here to finish saving, or leave and discard the unsaved draft.")} confirmLabel={tr("Leave without saving")} isDestructive isLoading={draft.pending} onConfirm={() => { if (draft.blocker.state === "blocked") draft.blocker.proceed(); }} />
  </article>;
}
