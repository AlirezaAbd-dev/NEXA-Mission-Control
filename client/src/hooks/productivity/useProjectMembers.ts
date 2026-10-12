import { useProductivity } from "./useProductivity";
import type { WorkspaceMember } from "@/types";
export function useProjectMembers(projectId?: string) {
  return useProductivity<(WorkspaceMember & { inherited?: number })[]>(
    `projects/${projectId}/members`,
    !!projectId,
  );
}
