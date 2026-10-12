import { useWorkspaceMetrics } from "@/hooks/enterprise/useWorkspaceMetrics";
import React from "react";
import { useParams, Link } from "react-router";
import { useCurrentUser } from "@/hooks/auth/useCurrentUser";
import { useWorkspaces } from "@/hooks/workspace/useWorkspaces";
import { useProjects } from "@/hooks/project/useProjects";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  FolderKanban,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const { data: user } = useCurrentUser();
  const { data: workspaces = [] } = useWorkspaces();

  const currentWorkspaceId = workspaceId || workspaces[0]?.id || "";
  const { data: metrics } = useWorkspaceMetrics(currentWorkspaceId);
  const { data: projects = [], isLoading: isProjectsLoading } =
    useProjects(currentWorkspaceId);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Welcome banner */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back, {user?.display_name || user?.username || "Commander"}
        </h1>
        <p className="text-slate-500 text-sm">
          Here is what is happening across your mission workspaces today.
        </p>
      </div>

      {/* KPI metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Workspaces
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {workspaces.length}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-500">
              <FolderKanban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Projects
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {projects.length}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Pending Actions
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {metrics?.pending ?? 0}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Urgent Tasks
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {metrics?.urgent ?? 0}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Active Projects
          </h2>
        </div>

        {isProjectsLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-slate-500 border border-dashed rounded-xl">
            No projects found in this workspace. Create one from the sidebar!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                to={`/p/${proj.id}/board`}
                className="group block"
              >
                <Card className="hover:border-teal-500/50 transition-all hover:shadow-md h-full">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-muted text-slate-500 uppercase">
                        {proj.identifier}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 transition-colors" />
                    </div>
                    <CardTitle className="text-base group-hover:text-teal-500 transition-colors pt-2">
                      {proj.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {proj.description || "No description provided."}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
