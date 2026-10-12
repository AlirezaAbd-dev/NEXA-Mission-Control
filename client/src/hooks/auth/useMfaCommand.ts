import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
interface Result {
  secret?: string;
  uri?: string;
  recovery_codes?: string[];
  enabled?: boolean;
}
export function useMfaCommand() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async ({
      command,
      password,
      otp,
    }: {
      command: "setup" | "enable" | "disable";
      password?: string;
      otp?: string;
    }) =>
      (await apiClient.post<Result>(`/auth/mfa/${command}`, { password, otp }))
        .data,
    onSuccess: () => cache.invalidateQueries({ queryKey: QUERY_KEYS.auth.mfa }),
  });
}
