import { RoleManager } from "@/features/localops/RoleManager";
import { TaskPermissionManager } from "@/features/localops/TaskPermissionManager";
import { LocalPlugins } from "@/features/localops/LocalPlugins";
import { DeskSettings } from "@/features/localops/DeskSettings";
import { ProjectMembers } from "@/features/productivity/ProjectMembers";
import { ProjectPrivacy } from "@/features/productivity/ProjectPrivacy";
import { ProjectProcessSettings } from "@/features/productivity/ProjectProcessSettings";
import { BoardTemplates } from "@/features/productivity/BoardTemplates";
import { MemberPermissions } from "@/features/productivity/MemberPermissions";
import { useParams } from "react-router";
import { ViewTabs } from "@/features/views/ViewTabs";
import { ResourceSection } from "./ResourceSection";
import { DataPortability } from "./DataPortability";
import { ArchiveCenter } from "./ArchiveCenter";
import { IntegrationSettings } from "./IntegrationSettings";
import { AuditLog } from "./AuditLog";
export function GovernancePage() {
  const { projectId = "" } = useParams();
  return (
    <div className="p-4 md:p-6 space-y-5 min-h-full flex-1 flex flex-col">
      <ViewTabs projectId={projectId} />
      <div>
        <h1 className="text-2xl font-bold">Project settings</h1>
        <p className="text-sm text-slate-500">
          Keep your work connected, portable, and accountable.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <DataPortability projectId={projectId} />
        <ArchiveCenter projectId={projectId} />
        <ResourceSection
          projectId={projectId}
          resource="documents"
          title="Documents, designs & cloud files"
        />
        <IntegrationSettings projectId={projectId} />
      </div>
      <ProjectPrivacy projectId={projectId} />
      <ProjectMembers projectId={projectId} />
      <ProjectProcessSettings projectId={projectId} />
      <BoardTemplates projectId={projectId} />
      <MemberPermissions projectId={projectId} />
      <RoleManager projectId={projectId} />
      <TaskPermissionManager projectId={projectId} />
      <DeskSettings projectId={projectId} />
      <LocalPlugins projectId={projectId} />
      <AuditLog projectId={projectId} />
    </div>
  );
}
