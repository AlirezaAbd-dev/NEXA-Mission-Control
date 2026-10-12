import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { useLocalResource } from "@/hooks/localops/useLocalResource";
import { useLocalMutation } from "@/hooks/localops/useLocalMutation";
import type { Session } from "./types";
export function DeskSettings({ projectId }: { projectId: string }) {
  const { data: session } = useLocalResource<Session>(projectId, "session"),
    { data: settings = [] } = useLocalResource<
      { response_hours: number; resolution_hours: number }[]
    >(projectId, "desk-settings", !!session?.can_manage),
    save = useLocalMutation(projectId),
    [open, setOpen] = useState(false),
    [response, setResponse] = useState(24),
    [resolution, setResolution] = useState(72);
  if (!session?.can_manage) return null;
  return (
    <section className="border border-border bg-card rounded-2xl p-5 space-y-3">
      <h2 className="font-bold">Service desk SLAs</h2>
      <p className="text-sm text-muted-foreground">
        First reply: {settings[0]?.response_hours || 24} hours · Resolution:{" "}
        {settings[0]?.resolution_hours || 72} hours. Applies to new requests;
        clocks use elapsed calendar hours.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setResponse(settings[0]?.response_hours || 24);
          setResolution(settings[0]?.resolution_hours || 72);
          setOpen(true);
        }}
      >
        Configure SLAs
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Service desk SLAs"
      >
        <div className="space-y-4">
          <Input
            label="Response hours"
            type="number"
            min={1}
            max={8760}
            value={response}
            onChange={(e) => setResponse(Number(e.target.value))}
          />
          <Input
            label="Resolution hours"
            type="number"
            min={1}
            max={8760}
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
          />
          <Button
            disabled={
              response < 1 ||
              resolution < 1 ||
              response > 8760 ||
              resolution > 8760
            }
            isLoading={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  path: "desk-settings",
                  data: {
                    response_hours: response,
                    resolution_hours: resolution,
                  },
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Save SLA policy
          </Button>
        </div>
      </Modal>
    </section>
  );
}
