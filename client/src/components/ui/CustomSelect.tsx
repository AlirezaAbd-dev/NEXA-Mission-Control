import type { ReactNode } from "react";
import { Select as NexaSelect } from "./NexaDropdown";
import { SearchableSelect } from "./SearchableSelect";
export interface SelectOption {
  label: string;
  value: string;
  icon?: ReactNode;
  description?: string;
}
export interface CustomSelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  error?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  size?: "default" | "sm";
}
export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select option…",
  label,
  ariaLabel,
  error,
  searchable = false,
  disabled,
  className,
  id,
  size,
}: CustomSelectProps) {
  if (searchable)
    return (
      <SearchableSelect
        id={id}
        options={options.map((o) => ({
          value: o.value,
          label: o.label,
          sublabel: o.description,
        }))}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        label={label}
        ariaLabel={ariaLabel}
        error={error}
        disabled={disabled}
        className={className}
        clearable={false}
      />
    );
  return (
    <NexaSelect
      options={options}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      label={label}
      error={error}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel || label || placeholder}
      size={size}
    />
  );
}

