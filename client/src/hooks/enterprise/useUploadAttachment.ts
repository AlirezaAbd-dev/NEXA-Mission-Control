import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { Attachment } from "./useAttachments";
export function useUploadAttachment(projectId: string, cardId: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (
        await apiClient.post<Attachment>(
          `/enterprise/projects/${projectId}/cards/${cardId}/attachments`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } },
        )
      ).data;
    },
    onSuccess: () =>
      cache.invalidateQueries({
        queryKey: QUERY_KEYS.cards.attachments(cardId),
      }),
  });
}
