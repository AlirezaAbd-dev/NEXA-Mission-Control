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
    <section className="rounded-xl border border-slate-200 dark:border-white/[0.06] p-5 bg-white dark:bg-[#0b0c10] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Personal API tokens</h2>
          <p className="text-xs text-slate-500">
            Tokens use your current workspace permissions. Use them with scripts or the Mission Control MCP Server.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          onClick={() => setShowMcpModal(true)}
        >
          <Cpu className="w-3.5 h-3.5" />
          MCP Manual & Setup
        </Button>
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
          label="Token name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Expires after days"
          type="number"
          min="1"
          max="365"
          required
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
        <Button type="submit" isLoading={create.isPending}>
          Create token
        </Button>
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
            <p className="text-xs text-slate-500">
              Expires {new Date(t.expires_at).toLocaleDateString()}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setId(t.id)}>
            Revoke
          </Button>
        </div>
      ))}
      <Modal
        isOpen={!!secret}
        onClose={() => setSecret("")}
        title="Save your API token"
      >
        <p className="text-sm text-slate-500 mb-4">
          Store it now. You will not be able to retrieve it again.
        </p>
        <Input aria-label="New API token" readOnly value={secret} />
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={() =>
              navigator.clipboard
                .writeText(secret)
                .catch(() =>
                  setError("Copy the token manually from the field above."),
                )
            }
          >
            Copy token
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400"
            onClick={() => setShowMcpModal(true)}
          >
            <Cpu className="w-4 h-4" />
            Configure MCP Client
          </Button>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!id}
        onClose={() => setId(undefined)}
        title="Revoke token?"
        description="Apps using this token will immediately lose access."
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
