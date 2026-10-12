import { ReleaseChangelog } from "./ReleaseChangelog";
import { useState } from "react";
import { Button, Input, Textarea, CustomSelect, Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { useSaveResource } from "@/hooks/enterprise/useSaveResource";
import { useRemoveResource } from "@/hooks/enterprise/useRemoveResource";
import { apiError } from "@/lib/apiError";
import type { EnterpriseResource, ResourceInput } from "@/types/enterprise";
export function ResourceSection({
  projectId,
  resource,
  title,
}: {
  projectId: string;
  resource: "epics" | "releases" | "documents";
  title: string;
}) {
  const {
      data: items = [],
      isLoading,
      error: loadError,
    } = useEnterpriseResource(projectId, resource),
    save = useSaveResource(projectId, resource),
    remove = useRemoveResource(projectId, resource);
  const [editing, setEditing] = useState<
      EnterpriseResource | null | undefined
    >(),
    [form, setForm] = useState<ResourceInput>({ name: "" }),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState<EnterpriseResource | null>(null),
    [preview, setPreview] = useState<EnterpriseResource | null>(null);
  const edit = (item?: EnterpriseResource) => {
    setEditing(item || null);
    setForm({
      name: item?.name || "",
      summary: item?.summary || item?.description || "",
      color: item?.color || "#0d9488",
      status:
        item?.status || (resource === "releases" ? "unreleased" : "planned"),
      target_date: item?.target_date || "",
      kind: item?.kind || "document",
      url: item?.url || "",
    });
    setError("");
  };
  return (
    <section className="rounded-xl border border-slate-200 dark:border-[#183035] bg-white dark:bg-[#0d1a1d] p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold">{title}</h2>
        <Button size="sm" variant="outline" onClick={() => edit()}>
          Add{" "}
          {resource === "epics"
            ? "epic"
            : resource === "releases"
              ? "release"
              : "link"}
        </Button>
      </div>
      {loadError && (
        <p role="alert" className="text-rose-500">
          {apiError(loadError)}
        </p>
      )}
      {isLoading ? (
        <div className="h-24 animate-pulse bg-slate-100 dark:bg-[#132428] rounded-lg" />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">
          No {resource} yet. Add one to organize your project.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#132428]"
            >
              <div className="space-y-1">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-600 dark:text-teal-300 font-medium"
                  >
                    {item.name} ↗
                  </a>
                ) : (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
                <p className="text-xs text-slate-500">
                  {item.summary || item.description || item.kind}{" "}
                  {item.target_date && `· ${item.target_date}`}{" "}
                  {item.total !== undefined &&
                    `· ${item.done}/${item.total} tasks complete`}{" "}
                  {item.status && `· ${item.status}`}
                </p>
                {item.total !== undefined && (
                  <progress
                    className="w-40 h-1.5 accent-teal-500"
                    max={Math.max(1, item.total)}
                    value={item.done || 0}
                    aria-label={`${item.name} progress`}
                  />
                )}
              </div>
              <div className="flex gap-2">
                {resource === "releases" && (
                  <ReleaseChangelog
                    projectId={projectId}
                    id={item.id}
                    name={item.name}
                  />
                )}{" "}
                {item.kind === "figma" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreview(item)}
                  >
                    Preview design
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => edit(item)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleting(item)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name}
        size="2xl"
      >
        {preview?.url && (
          <iframe
            title={preview.name}
            className="w-full h-[60vh] rounded-lg border-0"
            src={`https://www.figma.com/embed?embed_host=nexa&url=${encodeURIComponent(preview.url)}`}
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        )}
      </Modal>
      <Modal
        isOpen={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={`${editing ? "Edit" : "Add"} ${resource === "documents" ? "link" : resource.slice(0, -1)}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              { ...form, id: editing?.id },
              {
                onSuccess: () => setEditing(undefined),
                onError: (e) => setError(apiError(e)),
              },
            );
          }}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={form.name}
            required
            maxLength={120}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          {resource === "documents" ? (
            <>
              <CustomSelect
                label="Type"
                value={form.kind}
                onChange={(kind) => setForm((f) => ({ ...f, kind }))}
                options={[
                  "document",
                  "figma",
                  "google-drive",
                  "dropbox",
                  "onedrive",
                  "specification",
                ].map((value) => ({ value, label: value }))}
              />
              <Input
                label="HTTPS URL"
                type="url"
                required
                value={form.url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, url: e.target.value }))
                }
              />
            </>
          ) : (
            <>
              <Textarea
                label="Summary"
                value={form.summary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, summary: e.target.value }))
                }
              />
              <CustomSelect
                label="Status"
                value={form.status}
                onChange={(status) => setForm((f) => ({ ...f, status }))}
                options={(resource === "epics"
                  ? ["planned", "active", "completed"]
                  : ["unreleased", "released"]
                ).map((value) => ({ value, label: value }))}
              />
              <Input
                label="Target date"
                type="date"
                value={form.target_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, target_date: e.target.value }))
                }
              />
              {resource === "epics" && (
                <Input
                  label="Color"
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                />
              )}
            </>
          )}
          {error && (
            <p role="alert" className="text-rose-500 text-sm">
              {error}
            </p>
          )}
          <Button type="submit" isLoading={save.isPending}>
            Save
          </Button>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
            onError: (e) => setError(apiError(e)),
          })
        }
        title="Remove this item?"
        description="Linked tasks remain in the project."
        isDestructive
        isLoading={remove.isPending}
      />
    </section>
  );
}
