import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { WorkspaceDashboard } from "./types";
function localDay() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function useWorkspaceDashboard(workspace: string) {
  const [today, setToday] = useState(localDay);
  useEffect(() => { const timer = setInterval(() => setToday(localDay()), 60000); return () => clearInterval(timer); }, []);
  return useQuery({
    queryKey: ["workspaces", workspace, "dashboard", today],
    queryFn: async () => (await apiClient.get<WorkspaceDashboard>(`/enterprise/workspaces/${workspace}/dashboard`, { params: { today } })).data,
    enabled: !!workspace,
  });
}
