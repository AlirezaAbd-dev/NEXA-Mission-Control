import { type Editor, useEditorState } from "@tiptap/react";
import { PilcrowLeft, PilcrowRight } from "lucide-react";
import { Button } from "./Button";

const directions = [
  { value: "ltr", label: "LTR", description: "Left-to-right content", Icon: PilcrowRight },
  { value: "rtl", label: "RTL", description: "Right-to-left content", Icon: PilcrowLeft },
  { value: "auto", label: "Auto", description: "Automatic content direction" },
] as const;

export function EditorDirectionControls({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      ltr: editor.isActive({ dir: "ltr" }),
      rtl: editor.isActive({ dir: "rtl" }),
      auto: editor.isActive({ dir: "auto" }),
    }),
  });

  return (
    <div role="group" aria-label="Content direction" dir="ltr" className="flex items-center gap-0.5 border-e border-border/60 dark:border-white/10 pe-1.5 me-0.5">
      {directions.map(({ value, label, description, ...option }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={active[value] ? "primary" : "ghost"}
          className="h-7 gap-1 px-1.5 rounded-lg text-[11px]"
          aria-label={description}
          title={`${description} — apply to the current paragraph or selected blocks`}
          aria-pressed={active[value]}
          onMouseDown={event => event.preventDefault()}
          onClick={() => editor.chain().focus().setTextDirection(value).run()}
        >
          {"Icon" in option && <option.Icon aria-hidden="true" className="h-3.5 w-3.5" />}
          {label}
        </Button>
      ))}
    </div>
  );
}
