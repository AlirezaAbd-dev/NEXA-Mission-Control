import { formatNumber } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import { timerElapsedSeconds } from "@/lib/timerClock";
import { apiError } from "@/lib/apiError";
import React, { useState, useEffect } from "react";
import {
  Play,
  Square,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useTimeLogs,
  useCreateTimeLog,
  useDeleteTimeLog,
} from "@/hooks/timeLog/useTimeLogs";
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
} from "@/hooks/timeLog/useActiveTimer";

interface CardTimerProps {
  cardId: string;
}

export const CardTimer: React.FC<CardTimerProps> = ({ cardId }) => {
  useUiLocale();
  const { data: logs = [] } = useTimeLogs(cardId);
  const timerQuery = useActiveTimer(cardId);
  const { data: activeTimer } = timerQuery;
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const createTimeLog = useCreateTimeLog();
  const deleteTimeLog = useDeleteTimeLog();

  const [tick, setTick] = useState(() => performance.now());
  const elapsedSeconds = activeTimer ? timerElapsedSeconds(activeTimer, tick) : 0;
  const [showManualLog, setShowManualLog] = useState(false);
  const [showLogHistory, setShowLogHistory] = useState(false);
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  useEffect(() => {
    if (!activeTimer?.started_at) return;
    const timer = setInterval(() => setTick(performance.now()), 1000);
    return () => clearInterval(timer);
  }, [activeTimer?.started_at]);

  const formatStopwatch = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const totalMinutesLogged = logs.reduce((acc, log) => acc + log.minutes, 0);
  const totalHours = Math.floor(totalMinutesLogged / 60);
  const remainingMinutes = totalMinutesLogged % 60;
  const formattedTotal = totalHours > 0 ? tr("{value0}h {value1}m", { value0: totalHours, value1: remainingMinutes }) : tr("{value0}m", { value0: remainingMinutes });

  const handleToggleTimer = () => {
    if (activeTimer) {
      stopTimer.mutate({ cardId });
    } else {
      startTimer.mutate({ cardId });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(manualMinutes, 10);
    if (!mins || mins <= 0) return;

    createTimeLog.mutate(
      {
        card_id: cardId,
        minutes: mins,
        description: manualDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          setManualMinutes("");
          setManualDescription("");
          setShowManualLog(false);
        },
      },
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />{tr("Time Tracking")}</label>
        <span className="text-xs font-mono font-medium text-primary">
          {formattedTotal}{tr("logged")}</span>
      </div>

      {/* Stopwatch Banner */}
      {timerQuery.error && <div role="alert" className="text-xs text-danger space-y-2"><p>{apiError(timerQuery.error)}</p><Button variant="outline" size="sm" onClick={() => void timerQuery.refetch()}>{tr("Retry timer")}</Button></div>}
      <div
        className={`p-3 rounded-xl border transition-all ${
          activeTimer
            ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
            : "bg-[var(--nexa-surface-l2)] border-[var(--nexa-divider)]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                activeTimer ? "bg-primary animate-ping" : "bg-muted-foreground"
              }`}
            />
            <span dir="ltr" className="font-mono text-base font-bold tracking-wider text-foreground">
              {formatStopwatch(elapsedSeconds)}
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            variant={activeTimer ? "danger" : "primary"}
            onClick={handleToggleTimer}
            disabled={timerQuery.isLoading || !!timerQuery.error}
            isLoading={startTimer.isPending || stopTimer.isPending}
            className="h-8 text-xs font-medium cursor-pointer"
          >
            {activeTimer ? (
              <>
                <Square className="w-3 h-3 me-1 fill-current" />{tr("Stop")}</>
            ) : (
              <>
                <Play className="w-3 h-3 me-1 fill-current" />{tr("Start")}</>
            )}
          </Button>
        </div>

        {/* Quick buttons */}
        <div className="mt-2.5 pt-2 border-t border-[var(--nexa-divider)] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowManualLog(!showManualLog)}
            className="text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>{tr("Manual entry")}</span>
          </button>

          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLogHistory(!showLogHistory)}
              className="text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{formatNumber(logs.length)}{" "}{tr("logs")}</span>
              {showLogHistory ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {/* Manual Time Entry Form */}
        {showManualLog && (
          <form
            onSubmit={handleManualSubmit}
            className="mt-3 pt-2.5 border-t border-[var(--nexa-divider)] space-y-2"
          >
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={tr("Minutes")}
                min="1"
                max="1440"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                className="w-24 text-xs h-8"
                autoFocus
                required
              />
              <Input
                type="text"
                placeholder={tr("What did you work on?")}
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="flex-1 text-xs h-8"
              />
            </div>
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowManualLog(false)}
                className="h-7 text-xs"
              >{tr("Cancel")}</Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={createTimeLog.isPending}
                className="h-7 text-xs"
              >{tr("Log")}</Button>
            </div>
          </form>
        )}

        {/* Log History Dropdown */}
        {showLogHistory && logs.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-[var(--nexa-divider)] space-y-1.5 max-h-40 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[var(--nexa-surface-l3)] text-muted-foreground"
              >
                <div className="truncate pe-2">
                  <span className="font-semibold text-foreground me-1.5">
                    {formatNumber(log.minutes)}m
                  </span>
                  <span className="text-muted-foreground">
                    {log.description || log.user_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTimeLog.mutate({ id: log.id, cardId })}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title={tr("Delete log")}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
