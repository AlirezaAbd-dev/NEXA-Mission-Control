import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
export interface Attachment {
  id: string;
  card_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}
export function useAttachments(projectId: string, cardId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.cards.attachments(cardId),
    queryFn: async () =>
      (
        await apiClient.get<Attachment[]>(
          `/enterprise/projects/${projectId}/cards/${cardId}/attachments`,
        )
      ).data,
    enabled: !!cardId,
  });
}
