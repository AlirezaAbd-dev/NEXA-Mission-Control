import React from 'react';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DueDateBadgeProps {
  dueDate?: string | null;
  isCompleted?: boolean;
}

export const DueDateBadge: React.FC<DueDateBadgeProps> = ({ dueDate, isCompleted = false }) => {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const now = new Date();
  const isOverdue = !isCompleted && due < now;
  const isDueSoon = !isCompleted && !isOverdue && due.getTime() - now.getTime() < 24 * 60 * 60 * 1000;

  if (isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 className="w-3 h-3" />
        {formatDate(dueDate)}
      </span>
    );
  }

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 animate-pulse">
        <AlertCircle className="w-3 h-3" />
        {formatDate(dueDate)}
      </span>
    );
  }

  if (isDueSoon) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
        <Clock className="w-3 h-3" />
        {formatDate(dueDate)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-[#132428] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#183035]">
      <Clock className="w-3 h-3" />
      {formatDate(dueDate)}
    </span>
  );
};
