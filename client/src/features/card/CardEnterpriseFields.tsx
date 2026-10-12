import { CardProcessFields } from "@/features/productivity/CardProcessFields";
import { CardDevelopment } from "@/features/productivity/CardDevelopment";
import { SlaCountdown } from "./SlaCountdown";
import { dateKey } from "@/features/views/boardDates";
import { useState } from "react";
import { CustomSelect, Input, Button } from "@/components/ui";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { useCardMetadata } from "@/hooks/enterprise/useCardMetadata";
import { useRunMacro } from "@/hooks/enterprise/useRunMacro";
import { useCards } from "@/hooks/card/useCards";
import { apiError } from "@/lib/apiError";
import type { Card } from "@/types";
import type { CardMetadata } from "@/types/enterprise";
export function CardEnterpriseFields({ card }: { card: Card }) {
  const { data: epics = [] } = useEnterpriseResource(card.project_id, "epics"),
    { data: releases = [] } = useEnterpriseResource(
      card.project_id,
      "releases",
    ),
    { data: rows = [] } = useEnterpriseResource<CardMetadata[]>(
      card.project_id,
      "metadata",
    ),
    { data: cards = [] } = useCards({ project_id: card.project_id }),
    { data: rules = [] } = useEnterpriseResource(card.project_id, "rules"),
    save = useCardMetadata(card.project_id),
    run = useRunMacro(card.project_id);
  const [error, setError] = useState("");
  const metadata: CardMetadata = rows.find((r) => r.id === card.id) || {
    id: card.id,
    epic_id: null,
    parent_id: null,
    release_id: null,
    sla_due_at: null,
  };
  const change = (patch: Partial<CardMetadata>) =>
    save.mutate(
      { ...metadata, ...patch },
      { onError: (e) => setError(apiError(e)) },
    );
  return (
    <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-[#183035]">
      <CardProcessFields card={card} />
      <CardDevelopment projectId={card.project_id} cardId={card.id} />
      <h3 className="text-xs font-semibold text-slate-500 uppercase">
        Agile & automation
      </h3>
      <CustomSelect
        label="Epic"
        value={metadata.epic_id || ""}
        options={[
          { value: "", label: "No epic" },
          ...epics.map((e) => ({ value: e.id, label: e.name })),
        ]}
        onChange={(value) => change({ epic_id: value || null })}
      />
      <CustomSelect
        label="Parent task"
        searchable
        value={metadata.parent_id || ""}
        options={[
          { value: "", label: "No parent" },
          ...cards
            .filter((c) => c.id !== card.id)
            .map((c) => ({ value: c.id, label: c.title })),
        ]}
        onChange={(value) => change({ parent_id: value || null })}
      />
      <CustomSelect
        label="Release"
        value={metadata.release_id || ""}
        options={[
          { value: "", label: "No release" },
          ...releases.map((r) => ({ value: r.id, label: r.name })),
        ]}
        onChange={(value) => change({ release_id: value || null })}
      />
      <Input
        label="Response SLA deadline"
        type="datetime-local"
        value={localDeadline(metadata.sla_response_due_at)}
        onChange={(e) =>
          change({
            sla_response_due_at: e.target.value
              ? new Date(e.target.value).toISOString()
              : null,
          })
        }
      />
      <SlaCountdown
        label="Response"
        deadline={metadata.sla_response_due_at}
        completed={metadata.first_response_at}
      />
      <Input
        label="Resolution SLA deadline"
        type="datetime-local"
        value={localDeadline(metadata.sla_due_at)}
        onChange={(e) =>
          change({
            sla_due_at: e.target.value
              ? new Date(e.target.value).toISOString()
              : null,
          })
        }
      />
      <SlaCountdown
        label="Resolution"
        deadline={metadata.sla_due_at}
        completed={metadata.resolved_at}
      />
      {rules
        .filter((r) => r.trigger_type === "manual_card" && r.is_active)
        .map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() =>
              run.mutate(
                { id: r.id, card_id: card.id },
                { onError: (e) => setError(apiError(e)) },
              )
            }
            isLoading={run.isPending}
          >
            {r.name}
          </Button>
        ))}
      {error && (
        <p role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      )}
    </section>
  );
}

function localDeadline(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${dateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
