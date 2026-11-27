import { formatNumber } from "@/i18n";
import { DirectionalIcon } from "@/components/ui/DirectionalIcon";
import { tr, useUiLocale } from "@/i18n";
import React, { useState } from "react";
import { Link2, Plus, X, ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
  useCardLinks,
  useAddCardLink,
  useRemoveCardLink,
} from "@/hooks/card/useCardLinks";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { useUiStore } from "@/stores/ui.store";
import type { Card } from "@/types";

interface CardDependenciesProps {
  card: Card;
}

const LINK_TYPES = [
  { value: "blocks", get label() { return tr("Blocks"); } },
  { value: "blocked_by", get label() { return tr("Is Blocked By"); } },
  { value: "relates_to", get label() { return tr("Relates To"); } },
  { value: "mirrors", get label() { return tr("Cross-board reference"); } },
];

export const CardDependencies: React.FC<CardDependenciesProps> = ({ card }) => {
  useUiLocale();
  const { data: links = [] } = useCardLinks(card.id);
  const { data: projectCards = [] } = useEnterpriseResource<
    { id: string; title: string; project_id: string; project_name: string }[]
  >(card.project_id, "related-cards");
  const addLink = useAddCardLink();
  const removeLink = useRemoveCardLink();
  const openCardModal = useUiStore((s) => s.openCardModal);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedLinkType, setSelectedLinkType] = useState("relates_to");
  const [targetCardId, setTargetCardId] = useState("");

  // Available cards to link to (exclude self and already linked)
  const availableCards = projectCards
    .filter(
      (c) => c.id !== card.id && !links.some((l) => l.target_card_id === c.id),
    )
    .map((c) => ({
      value: c.id,
      label: `${c.project_name} · ${c.title}`,
    }));

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardId) return;

    addLink.mutate(
      {
        cardId: card.id,
        targetCardId,
        linkType: selectedLinkType,
      },
      {
        onSuccess: () => {
          setTargetCardId("");
          setIsAdding(false);
        },
      },
    );
  };

  const getLinkBadge = (type: string) => {
    switch (type) {
      case "blocks":
        return {
          icon: ShieldAlert,
          label: tr("Blocks"),
          color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        };
      case "blocked_by":
        return {
          icon: ShieldAlert,
          label: tr("Blocked by"),
          color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        };
      default:
        return {
          icon: Link2,
          label: tr("Relates to"),
          color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        };
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-[var(--nexa-divider)]">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-primary" />{tr("Linked Cards & Dependencies (")}{formatNumber(links.length)})
        </h3>
        {!isAdding && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 text-xs text-primary hover:opacity-80 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tr("Add Link")}</span>
          </Button>
        )}
      </div>

      {/* Add Link Form */}
      {isAdding && (
        <form
          onSubmit={handleAddLink}
          className="p-3 bg-[var(--nexa-surface-l2)] border border-[var(--nexa-divider)] rounded-xl space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">{tr("Relationship")}</label>
              <CustomSelect
                value={selectedLinkType}
                onChange={setSelectedLinkType}
                options={LINK_TYPES}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">{tr("Target Task")}</label>
              <CustomSelect
                value={targetCardId}
                onChange={setTargetCardId}
                options={availableCards}
                placeholder={tr("Choose target task...")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(false)}
              className="h-7 text-xs"
            >{tr("Cancel")}</Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!targetCardId}
              isLoading={addLink.isPending}
              className="h-7 text-xs"
            >{tr("Link Task")}</Button>
          </div>
        </form>
      )}

      {/* Links List */}
      {links.length > 0 ? (
        <div className="space-y-1.5">
          {links.map((link) => {
            const badge = getLinkBadge(link.link_type);
            const Icon = badge.icon;
            return (
              <div
                key={link.id}
                className="group flex items-center justify-between p-2 rounded-lg bg-[var(--nexa-surface-l2)] hover:bg-[var(--nexa-surface-l3)] border border-[var(--nexa-divider)] transition-all"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    {badge.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => openCardModal(link.target_card_id)}
                    className="text-xs font-medium text-foreground hover:text-primary truncate text-start cursor-pointer flex items-center gap-1"
                  >
                    <span>{link.target_card_title}</span>
                    <DirectionalIcon icon={ArrowRight} className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeLink.mutate({ cardId: card.id, linkId: link.id })
                  }
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all cursor-pointer"
                  title={tr("Remove link")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        !isAdding && (
          <div className="text-xs text-slate-400 dark:text-slate-500 italic py-1">{tr("No dependencies or links connected yet.")}</div>
        )
      )}
    </div>
  );
};
