import { AuditEventDetails } from "@/components/common/AuditEventDetails";
import {
  auditPayload,
  auditSummary,
} from "@/components/common/auditPresentation";
import { apiError } from "@/lib/apiError";
import React from "react";
import { History, ArrowRight, PlusCircle, Clock } from "lucide-react";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useCardActivities } from "@/hooks/card/useCardActivities";
import { formatRelativeTime } from "@/lib/utils";

interface CardActivityStreamProps {
  cardId: string;
}

export const CardActivityStream: React.FC<CardActivityStreamProps> = ({
  cardId,
}) => {
  const { data: activities = [], isLoading, error } = useCardActivities(cardId);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created_card":
        return <PlusCircle className="w-3.5 h-3.5 text-teal-500" />;
      case "moved_card":
        return <ArrowRight className="w-3.5 h-3.5 text-teal-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <History className="w-4 h-4 text-teal-500" />
        <span>Audit Trail & Activity</span>
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger">
          {apiError(error)}
        </p>
      )}
      {isLoading ? (
        <div className="text-xs text-slate-400 animate-pulse">
          Loading activity log...
        </div>
      ) : activities.length === 0 ? (
        <div className="text-xs text-slate-400 italic py-1">
          No recorded history for this card yet.
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          {activities.map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <UserAvatar
                displayName={act.actor_name || "System"}
                avatarUrl={act.actor_avatar}
                size="xs"
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {act.actor_name || "System"}
                  </span>
                  {getActionIcon(act.action)}
                  <span>
                    {auditSummary(act.action, auditPayload(act.payload))}
                  </span>
                  <time
                    dateTime={act.created_at}
                    title={new Date(act.created_at).toLocaleString()}
                    className="text-[11px] text-muted-foreground ms-auto"
                  >
                    {formatRelativeTime(act.created_at)}
                  </time>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(act.created_at).toLocaleString()}
                </p>
                <AuditEventDetails payload={auditPayload(act.payload)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
