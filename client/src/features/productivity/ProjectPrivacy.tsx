import { useState } from "react";
import { CustomSelect } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useProject } from "@/hooks/project/useProject";
import { useWorkspaces } from "@/hooks/workspace/useWorkspaces";
import { useProjectPrivacy } from "@/hooks/productivity/useProjectPrivacy";
export function ProjectPrivacy({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId),
    { data: workspaces = [] } = useWorkspaces(),
    save = useProjectPrivacy(projectId);
  const [change, setChange] = useState<"public" | "private">();
  const admin = ["owner", "admin"].includes(
    workspaces.find((w) => w.id === project?.workspace_id)?.user_role || "",
  );
  return (
    <section className="p-5 border rounded-xl space-y-3 border-slate-200 dark:border-[#183035]">
      <h2 className="font-semibold">Project visibility</h2>
      <p className="text-sm text-slate-500">
        Workspace administrators control visibility. Private projects allow
        project members and inherited administrators. Workspace-visible projects
        allow everyone in the workspace.
      </p>
      <CustomSelect
        disabled={!admin || save.isPending}
        value={project?.visibility || "public"}
        options={[
          { value: "public", label: "Workspace-visible" },
          { value: "private", label: "Private" },
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
          change === "public" ? "Share with workspace" : "Make project private"
        }
        description={
          change === "public"
            ? "All workspace members will be able to view this project and its tasks."
            : "Members without explicit project access will lose access. Workspace administrators retain access."
        }
        onConfirm={() => {
          if (change)
            save.mutate(change, { onSuccess: () => setChange(undefined) });
        }}
      />
    </section>
  );
}
