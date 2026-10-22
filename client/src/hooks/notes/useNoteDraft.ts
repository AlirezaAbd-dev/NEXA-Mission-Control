import { useEffect, useState } from "react";
import { useBeforeUnload, useBlocker } from "react-router";
import { useUpdateNote } from "./useNotes";
import type { Note } from "@/features/notes/types";
export function useNoteDraft(note: Note) {
  const [base, setBase] = useState(note);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body || "");
  const [saveError, setSaveError] = useState<unknown>(null);
  const [navigationSafe, setNavigationSafe] = useState(false);
  const update = useUpdateNote(note.id);
  const { mutate } = update;
  const dirty = title !== base.title || body !== (base.body || "");
  const pending = update.isPending;
  const writable = note.can_edit && !note.deleted_at;
  const blocker = useBlocker(dirty && !navigationSafe);
  useBeforeUnload(event => { if (dirty && !navigationSafe) { event.preventDefault(); event.returnValue = ""; } });
  // External query updates synchronize clean drafts only. Dirty drafts keep their
  // original version so the API detects conflicts instead of overwriting edits.
  useEffect(() => {
    if (!dirty && !pending && note.version > base.version) { setBase(note); setTitle(note.title); setBody(note.body || ""); }
  }, [note, base.version, dirty, pending]);
  useEffect(() => {
    if (blocker.state === "blocked" && (navigationSafe || !dirty && !pending)) blocker.proceed();
  }, [blocker, dirty, pending, navigationSafe]);
  useEffect(() => {
    if (!dirty || pending || saveError || navigationSafe || !writable || !title.trim() || title.trim().length > 160) return;
    const snapshot = { title: title.trim(), body };
    const timer = setTimeout(() => {
      mutate({ version: base.version, ...snapshot }, {
        onSuccess: saved => { setBase(saved); setTitle(current => current === title ? saved.title : current); },
        onError: error => setSaveError(error),
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [title, body, base.version, dirty, pending, saveError, writable, mutate, navigationSafe]);
  return {
    title, body, setTitle, setBody, dirty, pending, base, saveError, blocker, update,
    retry: () => setSaveError(null),
    allowNavigation: () => setNavigationSafe(true),
    reset: (latest: Note) => { setBase(latest); setTitle(latest.title); setBody(latest.body || ""); setSaveError(null); },
  };
}
