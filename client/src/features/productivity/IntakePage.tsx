import { useState } from "react";
import { useParams } from "react-router";
import { Button, Input, Textarea } from "@/components/ui";
import { useProductivity } from "@/hooks/productivity/useProductivity";
import { useProductivityMutation } from "@/hooks/productivity/useProductivityMutation";
import { apiError } from "@/lib/apiError";
export function IntakePage() {
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
    <main className="min-h-screen bg-slate-50 dark:bg-[#070e10] text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-xl mx-auto space-y-5 p-6 rounded-xl border border-slate-200 dark:border-[#183035]">
        <h1 className="text-2xl font-bold">{form?.name || "Request form"}</h1>
        {loadError ? (
          <p role="alert">This request form is unavailable.</p>
        ) : done ? (
          <p role="status" className="text-emerald-600">
            Your request has been submitted.
          </p>
        ) : (
          <>
            <Input
              label="Request title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              label={
                form?.require_description
                  ? "Description (required)"
                  : "Description"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && (
              <p role="alert" className="text-rose-500">
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
            >
              Submit request
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
