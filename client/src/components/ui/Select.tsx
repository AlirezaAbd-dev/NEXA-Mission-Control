import React from "react";
import {
  CustomSelect,
  type CustomSelectProps,
  type SelectOption,
} from "./CustomSelect";

export type { CustomSelectProps, SelectOption };
export { CustomSelect };

export interface SelectProps extends Omit<
  CustomSelectProps,
  "onChange" | "options"
> {
  onChange?: (value: string) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  options = [],
  children,
  onChange = () => {},
  ...props
}) => {
  // If children were passed as <option> elements, map them gracefully to options
  const resolvedOptions = [...options];

  if (children && resolvedOptions.length === 0) {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const p = child.props as Record<string, any>;
        resolvedOptions.push({
          value: String(p?.value ?? ""),
          label: String(p?.children ?? p?.value ?? ""),
        });
      }
    });
  }

  return (
    <CustomSelect options={resolvedOptions} onChange={onChange} {...props} />
  );
};
