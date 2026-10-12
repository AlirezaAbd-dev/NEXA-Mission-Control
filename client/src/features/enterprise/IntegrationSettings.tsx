import { useState } from "react";
import { Button, Input, CustomSelect, Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { useSaveResource } from "@/hooks/enterprise/useSaveResource";
import { useRemoveResource } from "@/hooks/enterprise/useRemoveResource";
import { useBoard } from "@/hooks/board/useBoard";
import { useAuthStore } from "@/stores/auth.store";
import { apiError } from "@/lib/apiError";
export function IntegrationSettings({ projectId }: { projectId: string }) {
  const { data: items = [], error: loadError } = useEnterpriseResource(
      projectId,
      "integrations",
    ),
    save = useSaveResource(projectId, "integrations"),
    remove = useRemoveResource(projectId, "integrations"),
    { data: board } = useBoard(projectId),
    user = useAuthStore((s) => s.user);
  const [modal, setModal] = useState(false),
    [kind, setKind] = useState("github"),
    [name, setName] = useState(""),
    [secret, setSecret] = useState(""),
    [url, setUrl] = useState(""),
    [column, setColumn] = useState(""),
    [error, setError] = useState(""),
    [id, setId] = useState<string>();
  const outbound = ["slack", "discord"].includes(kind);
  return (
    <section className="p-5 rounded-xl bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035] space-y-4">
      <div className="flex justify-between">
        <h2 className="font-semibold">Integrations</h2>
        <Button size="sm" variant="outline" onClick={() => setModal(true)}>
          Add integration
        </Button>
      </div>
      {loadError && (
        <p role="alert" className="text-sm text-rose-500">
          {apiError(loadError)}
        </p>
      )}
      {items.map((i) => (
        <div
          key={i.id}
          className="p-3 rounded-lg bg-slate-50 dark:bg-[#132428] space-y-2"
        >
          <div className="flex justify-between">
            <p className="text-sm font-medium">
              {i.name} · {i.kind}
            </p>
            <Button size="sm" variant="ghost" onClick={() => setId(i.id)}>
              Remove
            </Button>
          </div>
          {["github", "gitlab", "email"].includes(i.kind || "") && (
            <code className="block text-[10px] break-all text-slate-500">
              {window.location.origin}/api/v1/integrations/
              {i.kind === "email"
                ? `email/${i.id}`
                : `${i.kind}/webhook/${i.id}`}
            </code>
          )}
        </div>
      ))}
      {items.length === 0 && !loadError && (
        <p className="text-sm text-slate-500">
          Connect commit webhooks, email intake, or team alerts.
        </p>
      )}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Connect integration"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              {
                name,
                kind,
                config: outbound
                  ? { url }
                  : {
                      secret,
                      ...(kind === "email"
                        ? { column_id: column, owner_id: user?.id }
                        : {}),
                    },
              },
              {
                onSuccess: () => {
                  setModal(false);
                  setSecret("");
                  setUrl("");
                  setName("");
                },
                onError: (e) => setError(apiError(e)),
              },
            );
          }}
        >
          <Input
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <CustomSelect
            label="Provider"
            value={kind}
            onChange={setKind}
            options={["github", "gitlab", "email", "slack", "discord"].map(
              (value) => ({ value, label: value }),
            )}
          />
          {outbound ? (
            <Input
              label="Official webhook URL"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          ) : (
            <Input
              label="Signing secret / GitLab whsec_ token"
              type="password"
              minLength={32}
              required
              autoComplete="new-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          )}{" "}
          {kind === "email" && (
            <>
              <CustomSelect
                label="Target column"
                value={column}
                onChange={setColumn}
                options={
                  board?.columns.map((c) => ({ value: c.id, label: c.name })) ||
                  []
                }
              />
              <p className="text-xs text-slate-500">
                Send signed JSON from your mail gateway with subject, text, and
                from fields.
              </p>
            </>
          )}
          {kind === "gitlab" && (
            <p className="text-xs text-slate-500">
              Generate a signing token in GitLab’s webhook settings and paste
              its whsec_ value here. Enable push events.
            </p>
          )}
          {kind === "github" && (
            <p className="text-xs text-slate-500">
              Enable push events and use CARD- plus at least eight characters
              from the full task UUID in commit messages. Add #done to complete
              it.
            </p>
          )}
          {error && (
            <p className="text-sm text-rose-500" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" isLoading={save.isPending}>
            Connect
          </Button>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!id}
        onClose={() => setId(undefined)}
        title="Remove integration?"
        description="The webhook endpoint will stop accepting events."
        isDestructive
        onConfirm={() =>
          id &&
          remove.mutate(id, {
            onSuccess: () => setId(undefined),
            onError: (e) => setError(apiError(e)),
          })
        }
      />
    </section>
  );
}
