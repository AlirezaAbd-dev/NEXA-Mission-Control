import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { useCards } from "@/hooks/card/useCards";
import { useEnterpriseResource } from "@/hooks/enterprise/useEnterpriseResource";
import type { CardMetadata } from "@/types/enterprise";
export function ReleaseChangelog({
  projectId,
  id,
  name,
}: {
  projectId: string;
  id: string;
  name: string;
}) {
  const { data: cards = [] } = useCards({ project_id: projectId }),
    { data: metadata = [] } = useEnterpriseResource<CardMetadata[]>(
      projectId,
      "metadata",
    );
  const [open, setOpen] = useState(false);
  const tasks = cards.filter(
    (c) => metadata.find((m) => m.id === c.id)?.release_id === id,
  );
  const text = `# ${name}\n\n${tasks.length ? tasks.map((c) => `- ${c.title} (CARD-${c.id})`).join("\n") : "No tasks are linked to this release yet."}`;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Changelog
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={`${name} changelog`}
      >
        <pre className="text-xs whitespace-pre-wrap max-h-80 overflow-auto">
          {text}
        </pre>
        <Button
          className="mt-4"
          size="sm"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([text], { type: "text/markdown" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "release-notes.md";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download Markdown
        </Button>
      </Modal>
    </>
  );
}
