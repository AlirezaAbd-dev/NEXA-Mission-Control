import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { useParams } from "react-router";
import { Button, Input, Textarea } from "@/components/ui";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import { apiError } from "@/lib/apiError";
export function IntakePage() {
  useUiLocale();
  const { token = "" } = useParams(),
    { data: form, error: loadError } = useProductivity<{
      name: string;
      require_description: number;
    }>(`intake/${token}`, !!token),
    save = useProductivityMutation();
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="min-h-screen bg-[var(--nexa-surface-l0)] text-foreground p-6">
      <div className="max-w-xl mx-auto space-y-5 p-6 rounded-2xl bg-[var(--nexa-surface-l1)] border border-[var(--nexa-divider)]">
        <h1 className="text-2xl font-bold">{form?.name || tr("Request form")}</h1>
        {loadError ? (
          <p role="alert">{tr("This request form is unavailable.")}</p>
        ) : done ? (
          <p role="status" className="text-primary">{tr("Your request has been submitted.")}</p>
        ) : (
          <>
            <Input
              label={tr("Request title")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              label={
                form?.require_description
                  ? tr("Description (required)")
                  : tr("Description")
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}
            <Button
              disabled={!form || !title.trim() || save.isPending}
              onClick={async () => {
                try {
                  await save.mutateAsync({
                    path: `intake/${token}`,
                    data: { title, description },
                  });
                  setDone(true);
                } catch (e) {
                  setError(apiError(e));
                }
              }}
            >{tr("Submit request")}</Button>
          </>
        )}
      </div>
    </main>
  );
}
