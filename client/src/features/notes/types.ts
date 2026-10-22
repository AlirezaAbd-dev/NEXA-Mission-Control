export interface Note {
  id: string; owner_id: string | null; workspace_id: string | null; workspace_name: string | null; created_by: string | null;
  author_name: string | null; title: string; body?: string; pinned: boolean; version: number;
  deleted_at: string | null; created_at: string; updated_at: string; can_edit: boolean;
}
export interface NoteFilter { scope: "all" | "personal" | "workspace"; card_id?: string; workspace_id?: string; q?: string; trash: boolean }
export interface NoteUpdate { version: number; title?: string; body?: string; pinned?: boolean; trashed?: boolean }
export interface NoteLink { card_id: string; title: string; project_id: string; project_name: string; archived: boolean }
