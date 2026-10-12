import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { usePersonalTokens } from "@/hooks/enterprise/usePersonalTokens";
import { useCreateToken } from "@/hooks/enterprise/useCreateToken";
import { useRevokeToken } from "@/hooks/enterprise/useRevokeToken";
import { apiError } from "@/lib/apiError";
export function PersonalTokens() {
  const { data: tokens = [] } = usePersonalTokens(),
    create = useCreateToken(),
    revoke = useRevokeToken();
  const [name, setName] = useState(""),
    [days, setDays] = useState("30"),
    [secret, setSecret] = useState(""),
    [id, setId] = useState<string>(),
    [error, setError] = useState("");
  return (
    <section className="rounded-xl border border-slate-200 dark:border-[#183035] p-5 bg-white dark:bg-[#0d1a1d] space-y-4">
      <h2 className="font-semibold">Personal API tokens</h2>
      <p className="text-xs text-slate-500">
        Tokens use your current workspace permissions. The token value is shown
        once.
      </p>
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
        <Button
          className="mt-3"
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
    </section>
  );
}
