import { tr, useUiLocale } from "@/i18n";
import { RoleManager } from "@/features/localops/RoleManager";
import { TaskPermissionManager } from "@/features/localops/TaskPermissionManager";
import { LocalPlugins } from "@/features/localops/LocalPlugins";
import { DeskSettings } from "@/features/localops/DeskSettings";
import { ProjectMembers } from "@/features/productivity/ProjectMembers";
import { ProjectPrivacy } from "@/features/productivity/ProjectPrivacy";
import { ProjectDangerZone } from "@/features/project/ProjectDangerZone";
import { ProjectProcessSettings } from "@/features/productivity/ProjectProcessSettings";
import { BoardTemplates } from "@/features/productivity/BoardTemplates";
import { MemberPermissions } from "@/features/productivity/MemberPermissions";
import { useParams, useSearchParams } from "react-router";
import { CustomSelect } from "@/components/ui";
import { ViewTabs } from "@/features/views/ViewTabs";
import { ResourceSection } from "./ResourceSection";
import { DataPortability } from "./DataPortability";
import { ArchiveCenter } from "./ArchiveCenter";
import { IntegrationSettings } from "./IntegrationSettings";
import { AuditLog } from "./AuditLog";
export function GovernancePage() {
  useUiLocale();
  const { projectId = "" } = useParams();
  const [search, setSearch] = useSearchParams();
  const groups = [
    { value: "access", label: tr("Members & access") },
    { value: "workflow", label: tr("Workflow & service desk") },
    { value: "resources", label: tr("Resources") },
    { value: "integrations", label: tr("Integrations") },
    { value: "data", label: tr("Data & archive") },
    { value: "audit", label: tr("Audit history") },
  ];
  const requested = search.get("section");
  const section = groups.some(group => group.value === requested) ? requested : "access";
  return (
    <div className="p-4 md:p-6 space-y-5 min-h-full flex-1 flex flex-col">
      <ViewTabs projectId={projectId} />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{section === "resources" ? tr("Resources") : tr("Project settings")}</h1>
        <p className="text-sm text-muted-foreground">{tr("Manage this project's resources, configuration and access.")}</p>
      </div>
      {section !== "resources" && <CustomSelect className="w-full sm:max-w-sm" ariaLabel={tr("Project settings section")} value={section || "access"} options={groups.filter(group => group.value !== "resources")}
        onChange={value => setSearch(previous => { const next = new URLSearchParams(previous); next.set("section", value); return next; })} />}
      {section === "access" && <><ProjectPrivacy projectId={projectId} /><ProjectMembers projectId={projectId} /><MemberPermissions projectId={projectId} /><RoleManager projectId={projectId} /><TaskPermissionManager projectId={projectId} /></>}
      {section === "workflow" && <><ProjectProcessSettings projectId={projectId} /><BoardTemplates projectId={projectId} /><DeskSettings projectId={projectId} /><LocalPlugins projectId={projectId} /></>}
      {section === "resources" && <ResourceSection projectId={projectId} resource="documents" title={tr("Documents, designs & cloud files")} />}
      {section === "integrations" && <IntegrationSettings projectId={projectId} />}
      {section === "data" && <><DataPortability projectId={projectId} /><ArchiveCenter projectId={projectId} /><ProjectDangerZone projectId={projectId} /></>}
      {section === "audit" && <AuditLog projectId={projectId} />}
    </div>
  );
}
