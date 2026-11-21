import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { Button, Textarea, Modal, CustomSelect } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useLocalResource } from "@/hooks/localops/useLocalResource";
import { useLocalMutation } from "@/hooks/localops/useLocalMutation";
import { useCards } from "@/hooks/card/useCards";
import { apiError } from "@/lib/apiError";
import type { Session, Plugin } from "./types";
const templates = [
  {
    schema: 1,
    name: "Escalate task",
    version: "1.0.0",
    get description() { return tr("Raise priority to urgent."); },
    actions: [{ type: "set_priority", value: "urgent" }],
  },
  {
    schema: 1,
    name: "Complete checklist",
    version: "1.0.0",
    get description() { return tr("Mark all checklist items as completed."); },
    actions: [{ type: "mark_checklist_done", value: "" }],
  },
];
export function LocalPlugins({ projectId }: { projectId: string }) {
  useUiLocale();
  const { data: session } = useLocalResource<Session>(projectId, "session"),
    { data: plugins = [] } = useLocalResource<Plugin[]>(
      projectId,
      "plugins",
      !!session?.can_manage,
    ),
    { data: cards = [] } = useCards({ project_id: projectId }),
    save = useLocalMutation(projectId);
  const [open, setOpen] = useState(false),
    [manifest, setManifest] = useState(JSON.stringify(templates[0], null, 2)),
    [error, setError] = useState(""),
    [remove, setRemove] = useState<Plugin>(),
    [run, setRun] = useState<Plugin>(),
    [card, setCard] = useState("");
  if (!session?.can_manage) return null;
  async function install() {
    try {
      const value: unknown = JSON.parse(manifest);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(tr("Use a JSON object"));
      await save.mutateAsync({ path: "plugins", data: { manifest: value } });
      setOpen(false);
      setError("");
    } catch (e) {
      setError(
        e instanceof SyntaxError ? "Invalid JSON manifest" : apiError(e),
      );
    }
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex justify-between gap-3">
        <h2 className="font-bold">{tr("Local automation plugins")}</h2>
        <Button
          size="sm"
          onClick={() => {
            setOpen(true);
            setError("");
          }}
        >{tr("Install manifest")}</Button>
      </div>
      <p className="text-sm text-muted-foreground">{tr("Install declarative automation bundles. Plugins run locally as administrator-triggered task actions; scripts, network calls and external API keys are unsupported.")}</p>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <Button
            key={tr(t.name)}
            size="sm"
            variant="outline"
            onClick={() => {
              setManifest(JSON.stringify(t, null, 2));
              setOpen(true);
              setError("");
            }}
          >
            {tr(t.name)}
          </Button>
        ))}
      </div>
      {plugins.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap gap-2 items-center border-b border-border py-2"
        >
          <span className="flex-1">
            {p.name} · {p.version} · {p.enabled ? tr("Enabled") : tr("Disabled")}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={!p.enabled}
            onClick={() => {
              setRun(p);
              setCard("");
            }}
          >{tr("Run")}</Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              save.mutate({
                path: "plugins",
                data: { id: p.id, manifest: p.manifest, enabled: !p.enabled },
              })
            }
          >
            {p.enabled ? tr("Disable") : tr("Enable")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRemove(p)}>{tr("Uninstall")}</Button>
        </div>
      ))}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={tr("Install local plugin")}
        size="2xl"
      >
        <div className="space-y-4">
          <Textarea
            label={tr("Manifest JSON")}
            rows={16}
            value={manifest}
            onChange={(e) => setManifest(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <Button isLoading={save.isPending} onClick={() => void install()}>{tr("Install plugin")}</Button>
        </div>
      </Modal>
      <Modal
        isOpen={!!run}
        onClose={() => setRun(undefined)}
        title={tr("Run") + (run?.name || "plugin")}
      >
        <div className="space-y-4">
          <CustomSelect
            label={tr("Task")}
            value={card}
            onChange={setCard}
            options={cards.map((c) => ({ value: c.id, label: c.title }))}
          />
          <p className="text-sm text-muted-foreground">{tr("This applies the plugin's configured actions to the selected task.")}</p>
          <Button
            disabled={!card}
            isLoading={save.isPending}
            onClick={() => {
              if (run)
                save.mutate(
                  {
                    path: "plugins/" + run.id + "/run",
                    data: { card_id: card },
                  },
                  { onSuccess: () => setRun(undefined) },
                );
            }}
          >{tr("Run actions")}</Button>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!remove}
        onClose={() => setRemove(undefined)}
        title={tr("Uninstall plugin")}
        description={tr("The plugin and its manual automation definition will be removed.")}
        isDestructive
        onConfirm={() => {
          if (remove)
            save.mutate(
              { path: "plugins/" + remove.id, method: "delete" },
              { onSuccess: () => setRemove(undefined) },
            );
        }}
      />
    </section>
  );
}
