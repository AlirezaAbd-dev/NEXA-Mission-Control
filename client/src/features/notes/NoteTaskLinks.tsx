import { useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useNoteLinks, useChangeNoteLink } from "@/hooks/notes/useNotes";
import { useUiStore } from "@/stores/ui.store";
import { apiError } from "@/lib/apiError";
import type { WorkCard } from "@/types/productivity";
export function NoteTaskLinks({ id, workspace, disabled, readOnly }: { id: string; workspace: string; disabled: boolean; readOnly: boolean }) {
  const { data: links = [], error: loadError } = useNoteLinks(id);
  const { data: tasks = [] } = useProductivity<WorkCard[]>("workspaces/" + workspace + "/work", !!workspace && !readOnly);
  const change = useChangeNoteLink(id);
  const open = useUiStore(s => s.openCardModal);
  const [card, setCard] = useState("");
  return <section className="border-t border-border pt-4 space-y-3">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 size={15} />Linked tasks</h3>
    <p className="text-xs text-muted-foreground">Only tasks you have permission to view appear here.</p>
    {links.map(link => <div key={link.card_id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2">
      <Button variant="ghost" size="sm" className="min-w-0 h-auto text-start whitespace-normal" onClick={() => open(link.card_id)}>{link.project_name} · {link.title}{link.archived ? " (archived)" : ""}</Button>
      {!readOnly && <Button variant="ghost" size="icon" disabled={disabled || change.isPending} aria-label={"Unlink task: " + link.title} onClick={() => change.mutate({ card: link.card_id, remove: true })}><Unlink size={14} /></Button>}
    </div>)}
    {!links.length && <p className="text-sm text-muted-foreground">No linked tasks.</p>}
    {!readOnly && workspace && <div className="flex flex-col sm:flex-row sm:items-end gap-2">
      <div className="min-w-0 flex-1"><CustomSelect label="Link a task" searchable value={card} options={tasks.filter(t => !links.some(l => l.card_id === t.id)).map(t => ({ value: t.id, label: t.project_name + " · " + t.title }))} onChange={setCard} disabled={disabled || change.isPending} /></div>
      <Button size="sm" disabled={!card || disabled || change.isPending} onClick={() => change.mutate({ card, remove: false }, { onSuccess: () => setCard("") })}>Add link</Button>
    </div>}
    {(loadError || change.error) && <p role="alert" className="text-sm text-danger">{apiError(loadError || change.error)}</p>}
  </section>;
}
