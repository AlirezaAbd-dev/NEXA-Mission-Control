import { useState } from "react";
import { Button, Input, CustomSelect, Modal } from "@/components/ui";
import { useExportBoard } from "@/hooks/enterprise/useExportBoard";
import { useImportBoard } from "@/hooks/enterprise/useImportBoard";
import { apiError } from "@/lib/apiError";
export function DataPortability({ projectId }: { projectId: string }) {
  const exportBoard = useExportBoard(projectId),
    importBoard = useImportBoard(projectId);
  const [format, setFormat] = useState<"trello" | "mission-control">("trello"),
    [content, setContent] = useState<unknown>(),
    [filename, setFilename] = useState(""),
    [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="p-5 rounded-xl bg-white dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035] space-y-4">
      <h2 className="font-semibold">Export & import</h2>
      <p className="text-xs text-slate-500">
        Export your board or bring in tasks from Trello. Import creates new
        tasks and lists.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportBoard.mutate("csv", {
              onError: (e) => setMessage(apiError(e)),
            })
          }
        >
          Export CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportBoard.mutate("xlsx", {
              onError: (e) => setMessage(apiError(e)),
            })
          }
        >
          Export Excel
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportBoard.mutate("json", {
              onError: (e) => setMessage(apiError(e)),
            })
          }
        >
          Export JSON
        </Button>
      </div>
      <CustomSelect
        value={format}
        onChange={(v) => setFormat(v as typeof format)}
        options={[
          { value: "trello", label: "Trello JSON" },
          { value: "mission-control", label: "Mission Control JSON" },
        ]}
      />
      <Input
        label="Import file"
        type="file"
        accept=".json,application/json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 2_000_000) {
            setMessage("Choose a JSON file smaller than 2 MB.");
            return;
          }
          try {
            setContent(JSON.parse(await file.text()) as unknown);
            setFilename(file.name);
            setMessage("");
          } catch {
            setMessage("This file is not valid JSON.");
          }
        }}
      />
      <Button size="sm" disabled={!content} onClick={() => setConfirm(true)}>
        Review import
      </Button>
      {message && (
        <p role="status" className="text-sm text-teal-600 dark:text-teal-300">
          {message}
        </p>
      )}
      <Modal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        title="Import tasks?"
      >
        <p className="text-sm text-slate-500 mb-4">
          Import {filename} into this project. Existing tasks will remain.
          Repeating an import creates another copy.
        </p>
        <Button
          isLoading={importBoard.isPending}
          onClick={() =>
            importBoard.mutate(
              { format, data: content },
              {
                onSuccess: (r) => {
                  setMessage(`Imported ${r.imported} tasks.`);
                  setConfirm(false);
                  setContent(undefined);
                },
                onError: (e) => setMessage(apiError(e)),
              },
            )
          }
        >
          Import tasks
        </Button>
      </Modal>
    </section>
  );
}
