import { getPriorityColor } from "@/lib/utils";
import {
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Minus,
} from "lucide-react";

export interface PriorityBadgeProps {
  priority: string;
  showIcon?: boolean;
}

export const PriorityBadge = ({
  priority,
  showIcon = true,
}: PriorityBadgeProps) => {
  const getIcon = () => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case "high":
        return <ArrowUp className="w-3 h-3 text-orange-500" />;
      case "medium":
        return <ArrowRight className="w-3 h-3 text-yellow-500" />;
      case "low":
        return <ArrowDown className="w-3 h-3 text-teal-500" />;
      default:
        return <Minus className="w-3 h-3 text-slate-400" />;
    }
  };

  const formatText = (p: string) => {
    if (p === "no_priority") return "None";
    return p.charAt(0).toUpperCase() + p.slice(1);
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${getPriorityColor(priority)}`}
    >
      {showIcon && getIcon()}
      <span>{formatText(priority)}</span>
    </span>
  );
};
