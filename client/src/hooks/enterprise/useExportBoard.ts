import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
export function useExportBoard(projectId: string) {
  return useMutation({
    mutationFn: async (format: "csv" | "json" | "xlsx") => {
      const response = await apiClient.get(
        `/enterprise/projects/${projectId}/export`,
        { params: { format }, responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data as Blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `mission-control.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
}
