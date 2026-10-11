import React, { useState, useEffect } from 'react';
import { Play, Square, Clock, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  useTimeLogs,
  useCreateTimeLog,
  useDeleteTimeLog,
} from '@/hooks/timeLog/useTimeLogs';
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
} from '@/hooks/timeLog/useActiveTimer';

interface CardTimerProps {
  cardId: string;
}

export const CardTimer: React.FC<CardTimerProps> = ({ cardId }) => {
  const { data: logs = [] } = useTimeLogs(cardId);
  const { data: activeTimer } = useActiveTimer(cardId);
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const createTimeLog = useCreateTimeLog();
  const deleteTimeLog = useDeleteTimeLog();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showManualLog, setShowManualLog] = useState(false);
  const [showLogHistory, setShowLogHistory] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  // Live ticking stopwatch when active timer is running
  useEffect(() => {
    if (!activeTimer?.started_at) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(activeTimer.started_at).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.started_at]);

  const formatStopwatch = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalMinutesLogged = logs.reduce((acc, log) => acc + log.minutes, 0);
  const totalHours = Math.floor(totalMinutesLogged / 60);
  const remainingMinutes = totalMinutesLogged % 60;
  const formattedTotal = `${totalHours > 0 ? `${totalHours}h ` : ''}${remainingMinutes}m`;

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
          setManualMinutes('');
          setManualDescription('');
          setShowManualLog(false);
        },
      }
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-teal-500" />
          Time Tracking
        </label>
        <span className="text-xs font-mono font-medium text-teal-600 dark:text-teal-400">
          {formattedTotal} logged
        </span>
      </div>

      {/* Stopwatch Banner */}
      <div
        className={`p-3 rounded-xl border transition-all ${
          activeTimer
            ? 'bg-teal-500/10 dark:bg-teal-950/30 border-teal-500/40 ring-1 ring-teal-500/20'
            : 'bg-slate-50 dark:bg-[#0d1a1d] border-slate-200 dark:border-[#183035]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                activeTimer ? 'bg-teal-400 animate-ping' : 'bg-slate-400'
              }`}
            />
            <span className="font-mono text-base font-bold tracking-wider text-slate-900 dark:text-slate-100">
              {formatStopwatch(elapsedSeconds)}
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            variant={activeTimer ? 'danger' : 'primary'}
            onClick={handleToggleTimer}
            isLoading={startTimer.isPending || stopTimer.isPending}
            className="h-8 text-xs font-medium cursor-pointer"
          >
            {activeTimer ? (
              <>
                <Square className="w-3 h-3 mr-1 fill-current" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1 fill-current" />
                Start
              </>
            )}
          </Button>
        </div>

        {/* Quick buttons */}
        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#183035] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowManualLog(!showManualLog)}
            className="text-slate-500 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Manual entry</span>
          </button>

          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLogHistory(!showLogHistory)}
              className="text-slate-500 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{logs.length} logs</span>
              {showLogHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Manual Time Entry Form */}
        {showManualLog && (
          <form onSubmit={handleManualSubmit} className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#183035] space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Minutes"
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
                placeholder="What did you work on?"
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
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={createTimeLog.isPending}
                className="h-7 text-xs"
              >
                Log
              </Button>
            </div>
          </form>
        )}

        {/* Log History Dropdown */}
        {showLogHistory && logs.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#183035] space-y-1.5 max-h-40 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-100/50 dark:bg-[#132428] text-slate-600 dark:text-slate-300"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5">
                    {log.minutes}m
                  </span>
                  <span className="text-slate-400">
                    {log.description || log.user_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => deleteTimeLog.mutate({ id: log.id, cardId })}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  title="Delete log"
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
