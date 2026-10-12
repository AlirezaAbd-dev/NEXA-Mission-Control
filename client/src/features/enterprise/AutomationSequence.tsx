import { Button, CustomSelect } from "@/components/ui";
export interface ActionStep {
  type: string;
  value?: string;
}
export function AutomationSequence({
  steps,
  onChange,
  targets,
}: {
  steps: ActionStep[];
  onChange: (steps: ActionStep[]) => void;
  targets: (type: string) => { value: string; label: string }[];
}) {
  const kinds = [
    "set_priority",
    "assign_user",
    "add_label",
    "move_card",
    "mark_checklist_done",
    "archive_card",
  ];
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Then run these actions in order</h3>
      {steps.map((step, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <CustomSelect
            value={step.type}
            options={kinds.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
            onChange={(type) =>
              onChange(steps.map((s, j) => (j === i ? { type } : s)))
            }
          />
          {!["archive_card", "mark_checklist_done"].includes(step.type) && (
            <CustomSelect
              value={step.value || ""}
              options={targets(step.type)}
              onChange={(value) =>
                onChange(steps.map((s, j) => (j === i ? { ...s, value } : s)))
              }
            />
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(steps.filter((_, j) => i !== j))}
          >
            Remove action
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={steps.length >= 9}
        onClick={() =>
          onChange([...steps, { type: "set_priority", value: "high" }])
        }
      >
        Add another action
      </Button>
    </section>
  );
}
