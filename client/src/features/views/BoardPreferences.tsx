import { useBoardStore } from "@/stores/board.store";
import { useState } from "react";
import { Star, Bookmark } from "lucide-react";
import { Button, CustomSelect, Input, Modal } from "@/components/ui";
import { usePreferences } from "@/hooks/enterprise/usePreferences";
import { useSavePreferences } from "@/hooks/enterprise/useSavePreferences";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import { useSaveResource } from "@/hooks/enterprise/useSaveResource";
import { apiError } from "@/lib/apiError";
export function BoardPreferences({ projectId }: { projectId: string }) {
  const filters = useBoardStore();
  const { data: pref = {} } = usePreferences(projectId),
    save = useSavePreferences(projectId),
    { data: views = [] } = useEnterpriseResource(projectId, "views"),
    create = useSaveResource(projectId, "views");
  const [modal, setModal] = useState(false),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-label="Star board"
        onClick={() =>
          save.mutate(
            { ...pref, starred: !pref.starred },
            { onError: (e) => setError(apiError(e)) },
          )
        }
        className="h-8.5 px-2.5"
      >
        <Star
          size={14}
          className={pref.starred ? "fill-amber-400 text-amber-500" : ""}
        />
      </Button>
      <CustomSelect
        className="w-36 sm:w-40"
        size="sm"
        value={pref.grouping || "none"}
        onChange={(grouping) => save.mutate({ ...pref, grouping })}
        options={["none", "priority", "assignee", "epic"].map((value) => ({
          value,
          label: value === "none" ? "No swimlanes" : `Group by ${value}`,
        }))}
      />
      <CustomSelect
        className="w-32 sm:w-36"
        size="sm"
        value={pref.background || "petrol"}
        onChange={(background) => save.mutate({ ...pref, background })}
        options={[
          { value: "petrol", label: "Petrol Dark" },
          { value: "teal", label: "Teal Glow" },
          { value: "ocean", label: "Ocean Blue" },
          { value: "emerald", label: "Emerald Green" },
          { value: "sunset", label: "Sunset Twilight" },
          { value: "midnight", label: "Midnight Indigo" },
          { value: "purple", label: "Deep Purple" },
          { value: "slate", label: "Modern Slate" },
          { value: "neutral", label: "Neutral Minimal" },
        ]}
      />
      <CustomSelect
        className="w-32 sm:w-36"
        size="sm"
        placeholder="Saved views"
        options={views.map((v) => ({ value: v.id, label: v.name }))}
        onChange={(id) => {
          const view = views.find((v) => v.id === id);
          if (view?.config_json) {
            const config = JSON.parse(view.config_json) as typeof pref & {
              search?: string;
              priority?: string;
              assignee?: string;
              label?: string;
            };
            filters.setSearchQuery(config.search || "");
            filters.setFilterPriority(config.priority || "all");
            filters.setSelectedAssigneeId(config.assignee || null);
            filters.setSelectedLabelId(config.label || null);
            save.mutate(config);
          }
        }}
      />
      <Button size="sm" variant="outline" onClick={() => setModal(true)}>
        <Bookmark size={14} />
        Save view
      </Button>
      {error && (
        <p role="alert" className="text-sm text-rose-500">
          {error}
        </p>
      )}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Save this board view"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              {
                name,
                config: {
                  ...pref,
                  search: filters.searchQuery,
                  priority: filters.filterPriority,
                  assignee: filters.selectedAssigneeId || "",
                  label: filters.selectedLabelId || "",
                },
              },
              {
                onSuccess: () => {
                  setModal(false);
                  setName("");
                },
                onError: (e) => setError(apiError(e)),
              },
            );
          }}
        >
          <Input
            label="View name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" isLoading={create.isPending}>
            Save view
          </Button>
        </form>
      </Modal>
    </div>
  );
}
