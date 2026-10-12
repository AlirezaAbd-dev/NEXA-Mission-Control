import { Checkbox as NexaCheckbox } from "./NexaCheckbox";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Checkbox({ onChange, className, ...props }: CheckboxProps) {
  return (
    <NexaCheckbox
      {...props}
      onCheckedChange={onChange}
      wrapperClassName={className}
    />
  );
}
