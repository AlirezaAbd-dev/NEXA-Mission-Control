import { apiClient } from "./client";
import type { Note, NoteFilter, NoteUpdate, NoteLink } from "@/features/notes/types";
export const notesApi = {
  list: async (filter: NoteFilter) => (await apiClient.get<Note[]>("/notes", { params: filter })).data,
  get: async (id: string) => (await apiClient.get<Note>("/notes/" + id)).data,
  create: async (data: { workspace_id?: string; title: string; body?: string }) => (await apiClient.post<Note>("/notes", data)).data,
  update: async (id: string, data: NoteUpdate) => (await apiClient.put<Note>("/notes/" + id, data)).data,
  links: async (id: string) => (await apiClient.get<NoteLink[]>("/notes/" + id + "/links")).data,
  link: async (id: string, card_id: string) => apiClient.post("/notes/" + id + "/links", { card_id }),
  unlink: async (id: string, card_id: string) => apiClient.delete("/notes/" + id + "/links/" + card_id),
};
