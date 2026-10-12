import { CustomSelect } from "@/components/ui/CustomSelect";
import { useProjectMembers } from "@/hooks/productivity/useProjectMembers";
import React, { useState } from "react";
import { CheckSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { useChecklists } from "@/hooks/checklist/useChecklists";
import { useCreateChecklist } from "@/hooks/checklist/useCreateChecklist";
import { useCreateChecklistItem } from "@/hooks/checklist/useCreateChecklistItem";
import { useUpdateChecklistItem } from "@/hooks/checklist/useUpdateChecklistItem";
import type { Checklist, ChecklistItem } from "@/types";

import { ChecklistActions } from "./ChecklistActions";
import { useUpdateChecklist } from "@/hooks/checklist/useUpdateChecklist";
import { useDeleteChecklist } from "@/hooks/checklist/useDeleteChecklist";
import { useDeleteChecklistItem } from "@/hooks/checklist/useDeleteChecklistItem";

interface CardChecklistsProps {
  cardId: string;
  projectId: string;
}

export const CardChecklists: React.FC<CardChecklistsProps> = ({
  cardId,
  projectId,
}) => {
  const { data: checklists = [], isLoading } = useChecklists(cardId);
  const createChecklist = useCreateChecklist(cardId);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    createChecklist.mutate(newChecklistTitle.trim(), {
      onSuccess: () => {
        setNewChecklistTitle("");
        setIsAddingChecklist(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="text-xs text-slate-400 animate-pulse">
        Loading checklists...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checklists.map((list) => {
        const completed = list.items.filter((i) => i.is_done).length;
        const total = list.items.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div
            key={list.id}
            className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card"
          >
            <ChecklistHeader
              list={list}
              cardId={cardId}
              projectId={projectId}
              progress={progress}
            />

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-1.5 pt-1">
              {list.items.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  cardId={cardId}
                  projectId={projectId}
                  item={item}
                />
              ))}
            </div>

            {/* Add Item Row */}
            <AddChecklistItemInput
              cardId={cardId}
              projectId={projectId}
              checklistId={list.id}
            />
          </div>
        );
      })}

      {isAddingChecklist ? (
        <form onSubmit={handleCreateChecklist} className="space-y-2">
          <Input
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            placeholder="Checklist title..."
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              type="submit"
              isLoading={createChecklist.isPending}
            >
              Add Checklist
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAddingChecklist(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAddingChecklist(true)}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 me-1.5" />
          Add Checklist
        </Button>
      )}
    </div>
  );
};

const ChecklistHeader = ({
  list,
  cardId,
  projectId,
  progress,
}: {
  list: Checklist;
  cardId: string;
  projectId: string;
  progress: number;
}) => {
  const update = useUpdateChecklist(cardId, projectId);
  const remove = useDeleteChecklist(cardId, projectId);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
      <h3 className="font-semibold text-sm min-w-0 flex-1 break-words">
        {list.title}
      </h3>
      <span className="text-xs text-muted-foreground font-mono shrink-0">
        {progress}%
      </span>
      <ChecklistActions
        kind="checklist"
        title={list.title}
        maxLength={100}
        onSave={(title) => update.mutateAsync({ id: list.id, title })}
        onDelete={() => remove.mutateAsync(list.id)}
      />
    </div>
  );
};

interface ChecklistItemRowProps {
  cardId: string;
  projectId: string;
  item: ChecklistItem;
}

const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({
  cardId,
  projectId,
  item,
}) => {
  const updateItem = useUpdateChecklistItem(cardId, projectId);
  const deleteItem = useDeleteChecklistItem(cardId, projectId);
  const { data: members = [] } = useProjectMembers(projectId);

  const handleToggle = () => {
    updateItem.mutate({
      itemId: item.id,
      is_done: !item.is_done,
    });
  };

  return (
    <div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3 gap-y-2 p-2 rounded-xl hover:bg-muted/40 transition-colors group">
      <Checkbox
        aria-label={"Complete " + item.title}
        disabled={updateItem.isPending}
        checked={item.is_done}
        onChange={handleToggle}
      />
      <div className="flex items-start gap-2 min-w-0">
        <span
          className={
            "text-sm min-w-0 flex-1 break-words py-1 " +
            (item.is_done
              ? "line-through text-muted-foreground"
              : "text-foreground")
          }
        >
          {item.title}
        </span>
        <ChecklistActions
          kind="item"
          title={item.title}
          maxLength={255}
          onSave={(title) => updateItem.mutateAsync({ itemId: item.id, title })}
          onDelete={() => deleteItem.mutateAsync(item.id)}
        />
      </div>
      <div className="col-start-2 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <div className="min-w-0">
          <Input
            type="date"
            label="Due date"
            aria-label={`Due date for ${item.title}`}
            value={item.due_date?.slice(0, 10) || ""}
            onChange={(e) =>
              updateItem.mutate({
                itemId: item.id,
                due_date: e.target.value || null,
              })
            }
          />
        </div>
        <CustomSelect
          label="Assignee"
          className="min-w-0"
          value={item.assignee_id || ""}
          options={[
            { value: "", label: "Unassigned" },
            ...members.map((m) => ({
              value: m.user_id,
              label: m.display_name,
            })),
          ]}
          onChange={(id) =>
            updateItem.mutate({ itemId: item.id, assignee_id: id || null })
          }
        />
      </div>
    </div>
  );
};

interface AddChecklistItemInputProps {
  cardId: string;
  projectId: string;
  checklistId: string;
}

const AddChecklistItemInput: React.FC<AddChecklistItemInputProps> = ({
  cardId,
  projectId,
  checklistId,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const createItem = useCreateChecklistItem(cardId, projectId);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createItem.mutate(
      { checklistId, title: title.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setIsAdding(false);
        },
      },
    );
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1.5 py-1 px-1.5 rounded transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add an item
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} className="space-y-2 pt-1">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add an item..."
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button size="sm" type="submit" isLoading={createItem.isPending}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
