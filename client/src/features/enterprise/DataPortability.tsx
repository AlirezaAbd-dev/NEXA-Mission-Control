import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { Button, Input, CustomSelect, Modal } from "@/components/ui";
import { useExportBoard } from "@/hooks/enterprise/useExportBoard";
import { useImportBoard } from "@/hooks/enterprise/useImportBoard";
import { apiError } from "@/lib/apiError";
export function DataPortability({ projectId }: { projectId: string }) {
  useUiLocale();
  const exportBoard = useExportBoard(projectId),
    importBoard = useImportBoard(projectId);
  const [format, setFormat] = useState<"trello" | "mission-control">("trello"),
    [content, setContent] = useState<unknown>(),
    [filename, setFilename] = useState(""),
    [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="p-5 rounded-xl bg-white dark:bg-[#0b0c10] border border-slate-200 dark:border-white/[0.06] space-y-4">
      <h2 className="font-semibold">{tr("Export & import")}</h2>
      <p className="text-xs text-slate-500">{tr("Export your board or bring in tasks from Trello. Import creates new tasks and lists.")}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportBoard.mutate("csv", {
              onError: (e) => setMessage(apiError(e)),
            })
          }
        >{tr("Export CSV")}</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportBoard.mutate("xlsx", {
              onError: (e) => setMessage(apiError(e)),
            })
          }
        >{tr("Export Excel")}</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportBoard.mutate("json", {
              onError: (e) => setMessage(apiError(e)),
            })
          }
        >{tr("Export JSON")}</Button>
      </div>
      <CustomSelect
        value={format}
        onChange={(v) => setFormat(v as typeof format)}
        options={[
          { value: "trello", label: tr("Trello JSON") },
          { value: "mission-control", label: tr("Mission Control JSON") },
        ]}
      />
      <Input
        label={tr("Import file")}
        type="file"
        accept=".json,application/json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 2_000_000) {
            setMessage(tr("Choose a JSON file smaller than 2 MB."));
            return;
          }
          try {
            setContent(JSON.parse(await file.text()) as unknown);
            setFilename(file.name);
            setMessage("");
          } catch {
            setMessage(tr("This file is not valid JSON."));
          }
        }}
      />
      <Button size="sm" disabled={!content} onClick={() => setConfirm(true)}>{tr("Review import")}</Button>
      {message && (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-300">
          {message}
        </p>
      )}
      <Modal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        title={tr("Import tasks?")}
      >
        <p className="text-sm text-slate-500 mb-4">{tr("Import")}{filename}{tr("into this project. Existing tasks will remain. Repeating an import creates another copy.")}</p>
        <Button
          isLoading={importBoard.isPending}
          onClick={() =>
            importBoard.mutate(
              { format, data: content },
              {
                onSuccess: (r) => {
                  setMessage(tr("Imported {value0} tasks.", { value0: (r.imported) }));
                  setConfirm(false);
                  setContent(undefined);
                },
                onError: (e) => setMessage(apiError(e)),
              },
            )
          }
        >{tr("Import tasks")}</Button>
      </Modal>
    </section>
  );
}
