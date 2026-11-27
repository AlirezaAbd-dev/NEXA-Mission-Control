import { dateLocale } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { usePersonalTokens } from "@/hooks/enterprise/usePersonalTokens";
import { useCreateToken } from "@/hooks/enterprise/useCreateToken";
import { useRevokeToken } from "@/hooks/enterprise/useRevokeToken";
import { apiError } from "@/lib/apiError";
import { McpManualModal } from "./McpManualModal";
import { Cpu } from "lucide-react";

export function PersonalTokens() {
  useUiLocale();
  const { data: tokens = [] } = usePersonalTokens(),
    create = useCreateToken(),
    revoke = useRevokeToken();
  const [name, setName] = useState(""),
    [days, setDays] = useState("30"),
    [secret, setSecret] = useState(""),
    [id, setId] = useState<string>(),
    [error, setError] = useState(""),
    [showMcpModal, setShowMcpModal] = useState(false);
  return (
    <section className="rounded-2xl border border-[var(--nexa-divider)] p-5 bg-[var(--nexa-surface-l1)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{tr("Personal API tokens")}</h2>
          <p className="text-xs text-muted-foreground">{tr("Tokens use your current workspace permissions. Use them with scripts or the Mission Control MCP Server.")}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5 text-xs text-info border-info/30 hover:bg-info/10"
          onClick={() => setShowMcpModal(true)}
        >
          <Cpu className="w-3.5 h-3.5" />{tr("MCP Manual & Setup")}</Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate(
            { name, days: Number(days) },
            {
              onSuccess: (r) => {
                setSecret(r.token);
                setName("");
              },
              onError: (e) => setError(apiError(e)),
            },
          );
        }}
      >
        <Input
          label={tr("Token name")}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={tr("Expires after days")}
          type="number"
          min="1"
          max="365"
          required
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
        <Button type="submit" isLoading={create.isPending}>{tr("Create token")}</Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-rose-500">
          {error}
        </p>
      )}
      {tokens.map((t) => (
        <div key={t.id} className="flex justify-between items-center gap-3">
          <div>
            <p className="text-sm">{t.name}</p>
            <p className="text-xs text-slate-500">{tr("Expires")}{new Date(t.expires_at).toLocaleDateString(dateLocale())}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setId(t.id)}>{tr("Revoke")}</Button>
        </div>
      ))}
      <Modal
        isOpen={!!secret}
        onClose={() => setSecret("")}
        title={tr("Save your API token")}
      >
        <p className="text-sm text-slate-500 mb-4">{tr("Store it now. You will not be able to retrieve it again.")}</p>
        <Input aria-label={tr("New API token")} readOnly value={secret} />
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={() =>
              navigator.clipboard
                .writeText(secret)
                .catch(() =>
                  setError(tr("Copy the token manually from the field above.")),
                )
            }
          >{tr("Copy token")}</Button>
          <Button
            variant="outline"
            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400"
            onClick={() => setShowMcpModal(true)}
          >
            <Cpu className="w-4 h-4" />{tr("Configure MCP Client")}</Button>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!id}
        onClose={() => setId(undefined)}
        title={tr("Revoke token?")}
        description={tr("Apps using this token will immediately lose access.")}
        isDestructive
        onConfirm={() =>
          id &&
          revoke.mutate(id, {
            onSuccess: () => setId(undefined),
            onError: (e) => setError(apiError(e)),
          })
        }
      />
      <McpManualModal
        isOpen={showMcpModal}
        onClose={() => setShowMcpModal(false)}
        activeToken={secret}
      />
    </section>
  );
}
