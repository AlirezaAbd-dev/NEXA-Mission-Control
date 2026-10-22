import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/lib/api/notes.api";
import { QUERY_KEYS as K } from "@/constants/queryKeys";
import type { Note, NoteFilter, NoteUpdate } from "@/features/notes/types";
export function useNotes(filter: NoteFilter, enabled = true) { return useQuery({ queryKey: K.notes.list(filter), queryFn: () => notesApi.list(filter), enabled: enabled && (filter.scope !== "workspace" || !!filter.workspace_id) }); }
export function useNote(id: string) { return useQuery({ queryKey: K.notes.detail(id), queryFn: () => notesApi.get(id), enabled: !!id, retry: false }); }
export function useCreateNote() { const cache = useQueryClient(); return useMutation({ meta: { handlesError: true }, mutationFn: notesApi.create, onSuccess: async note => { cache.setQueryData(K.notes.detail(note.id), note); await cache.invalidateQueries({ queryKey: K.notes.lists }); } }); }
export function useUpdateNote(id: string) {
  const cache = useQueryClient();
  return useMutation({ meta: { handlesError: true }, mutationFn: (data: NoteUpdate) => notesApi.update(id, data), onSuccess: async (note: Note) => { cache.setQueryData(K.notes.detail(id), note); await cache.invalidateQueries({ queryKey: K.notes.lists }); } });
}
export function useNoteLinks(id: string) { return useQuery({ queryKey: K.notes.links(id), queryFn: () => notesApi.links(id), enabled: !!id }); }
export function useChangeNoteLink(id: string) {
  const cache = useQueryClient();
  return useMutation({
    meta: { handlesError: true }, mutationFn: ({ card, remove }: { card: string; remove: boolean }) => remove ? notesApi.unlink(id, card) : notesApi.link(id, card),
    onSuccess: () => cache.invalidateQueries({ queryKey: K.notes.all })
  });
}
