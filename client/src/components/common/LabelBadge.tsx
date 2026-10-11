import React from 'react';

export interface LabelBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
}

export const LabelBadge = ({ name, color, onRemove }: LabelBadgeProps) => {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-2xs"
      style={{ backgroundColor: color }}
    >
      <span>{name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 focus:outline-none"
        >
          ×
        </button>
      )}
    </span>
  );
};
