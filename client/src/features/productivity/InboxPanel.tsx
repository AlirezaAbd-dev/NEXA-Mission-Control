import { useState } from "react";
import { Button, Input, Textarea, CustomSelect, Modal } from "@/components/ui";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import { useProjects } from "@/hooks/project/useProjects";
import { useBoard } from "@/hooks/board/useBoard";
import { apiError } from "@/lib/apiError";
import type { InboxItem } from "@/types/productivity";
export function InboxPanel({ workspaceId }: { workspaceId: string }) {
  const { data: items = [] } = useProductivity<InboxItem[]>("personal/inbox"),
    save = useProductivityMutation(),
    { data: projects = [] } = useProjects(workspaceId);
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [convert, setConvert] = useState<string>(),
    [project, setProject] = useState(""),
    [column, setColumn] = useState(""),
    [error, setError] = useState("");
  const { data: board } = useBoard(project);
  const add = async () => {
    try {
      await save.mutateAsync({
        path: "personal/inbox",
        data: { title, description },
      });
      setTitle("");
      setDescription("");
      setError("");
    } catch (e) {
      setError(apiError(e));
    }
  };
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Personal Inbox</h2>
      <p className="text-sm text-slate-500">
        Capture ideas now. Organize them into a project when you are ready.
      </p>
      <div className="space-y-2 max-w-xl">
        <Input
          label="Quick capture"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
        />
        <Textarea
          label="Notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button
          disabled={!title.trim() || save.isPending}
          onClick={() => void add()}
        >
          Capture idea
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-rose-500">
          {error}
        </p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="p-4 rounded-xl border border-slate-200 dark:border-[#183035] flex justify-between gap-4"
        >
          <div className={item.done ? "line-through opacity-60" : ""}>
            <h3>{item.title}</h3>
            <p className="text-sm text-slate-500">{item.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                save.mutate({
                  path: `personal/inbox/${item.id}`,
                  method: "put",
                  data: {
                    title: item.title,
                    description: item.description,
                    done: !item.done,
                  },
                })
              }
            >
              {item.done ? "Reopen" : "Done"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setConvert(item.id);
                setProject(projects[0]?.id || "");
                setColumn("");
              }}
            >
              Move to project
            </Button>
          </div>
        </div>
      ))}
      {!items.length && <p className="text-slate-500">Your inbox is clear.</p>}
      <Modal
        isOpen={!!convert}
        onClose={() => setConvert(undefined)}
        title="Move idea to project"
      >
        <div className="space-y-4">
          <CustomSelect
            label="Project"
            value={project}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => {
              setProject(v);
              setColumn("");
            }}
          />
          <CustomSelect
            label="Column"
            value={column}
            options={(board?.columns || []).map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            onChange={setColumn}
          />
          <Button
            disabled={!column || save.isPending}
            onClick={async () => {
              try {
                await save.mutateAsync({
                  path: `personal/inbox/${convert}/convert`,
                  data: { project_id: project, column_id: column },
                });
                setConvert(undefined);
              } catch (e) {
                setError(apiError(e));
              }
            }}
          >
            Create task
          </Button>
        </div>
      </Modal>
    </section>
  );
}
