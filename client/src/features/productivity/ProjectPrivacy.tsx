import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { CustomSelect } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useProject } from "@/hooks/project/useProject";
import { useWorkspaces } from "@/hooks/workspace/useWorkspaces";
import { useProjectPrivacy } from "@/hooks/productivity/useProjectPrivacy";
export function ProjectPrivacy({ projectId }: { projectId: string }) {
  useUiLocale();
  const { data: project } = useProject(projectId),
    { data: workspaces = [] } = useWorkspaces(),
    save = useProjectPrivacy(projectId);
  const [change, setChange] = useState<"public" | "private">();
  const admin = ["owner", "admin"].includes(
    workspaces.find((w) => w.id === project?.workspace_id)?.user_role || "",
  );
  return (
    <section className="p-5 border rounded-xl space-y-3 border-slate-200 dark:border-white/[0.06]">
      <h2 className="font-semibold">{tr("Project visibility")}</h2>
      <p className="text-sm text-slate-500">{tr("Workspace administrators control visibility. Private projects allow project members and inherited administrators. Workspace-visible projects allow everyone in the workspace.")}</p>
      <CustomSelect
        disabled={!admin || save.isPending}
        value={project?.visibility || "public"}
        options={[
          { value: "public", label: tr("Workspace-visible") },
          { value: "private", label: tr("Private") },
        ]}
        onChange={(value) => {
          if (value !== project?.visibility)
            setChange(value as "public" | "private");
        }}
      />
      <ConfirmModal
        isOpen={!!change}
        onClose={() => setChange(undefined)}
        title={
          change === "public" ? tr("Share with workspace") : tr("Make project private")
        }
        description={
          change === "public"
            ? tr("All workspace members will be able to view this project and its tasks.")
            : tr("Members without explicit project access will lose access. Workspace administrators retain access.")
        }
        onConfirm={() => {
          if (change)
            save.mutate(change, { onSuccess: () => setChange(undefined) });
        }}
      />
    </section>
  );
}
