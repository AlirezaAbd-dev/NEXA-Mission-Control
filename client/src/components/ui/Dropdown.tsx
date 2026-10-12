import type { ReactNode } from "react";
import {
  Dropdown as NexaDropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem as NexaItem,
} from "./NexaDropdown";
export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}
export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}
export function Dropdown({
  trigger,
  items,
  align = "right",
  className,
}: DropdownProps) {
  return (
    <NexaDropdown>
      <DropdownTrigger
        showChevron={false}
        className="border-0 p-1 shadow-none bg-transparent"
        aria-label="Open actions"
      >
        {trigger}
      </DropdownTrigger>
      <DropdownContent
        align={align === "right" ? "end" : "start"}
        className={className}
      >
        {items.map((item) => (
          <NexaItem key={item.id} onClick={item.onClick} danger={item.danger}>
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
          </NexaItem>
        ))}
      </DropdownContent>
    </NexaDropdown>
  );
}
