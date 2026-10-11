import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox = ({ checked, onChange, label, disabled = false, className }: CheckboxProps) => {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none text-xs', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'w-4 h-4 rounded border flex items-center justify-center transition-all',
          checked
            ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400'
        )}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
      {label && <span className={cn('text-slate-700 dark:text-slate-300', checked && 'line-through text-slate-400 dark:text-slate-500')}>{label}</span>}
    </label>
  );
};
