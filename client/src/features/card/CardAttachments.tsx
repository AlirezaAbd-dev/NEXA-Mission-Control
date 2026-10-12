import { useRef, useState } from "react";
import { Paperclip, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useUpdateCard } from "@/hooks/card/useUpdateCard";
import { useAttachments } from "@/hooks/enterprise/useAttachments";
import { useUploadAttachment } from "@/hooks/enterprise/useUploadAttachment";
import { useRemoveAttachment } from "@/hooks/enterprise/useRemoveAttachment";
import { apiError } from "@/lib/apiError";
import type { Card } from "@/types";
export function CardAttachments({
  card,
  projectId,
}: {
  card: Card;
  projectId: string;
}) {
  const { data: files = [], error: loadError } = useAttachments(
      projectId,
      card.id,
    ),
    upload = useUploadAttachment(projectId, card.id),
    remove = useRemoveAttachment(projectId, card.id),
    update = useUpdateCard(projectId);
  const input = useRef<HTMLInputElement>(null),
    [deleting, setDeleting] = useState<string>(),
    [error, setError] = useState("");
  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="flex gap-2 text-sm font-semibold">
          <Paperclip size={16} />
          Attachments · {files.length}
        </h3>
        <input
          ref={input}
          className="hidden"
          type="file"
          aria-label="Attach a file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > 10 * 1024 * 1024)
                setError("Choose a file up to 10 MB.");
              else
                upload.mutate(file, {
                  onError: (e) => setError(apiError(e)),
                  onSuccess: () => setError(""),
                });
            }
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => input.current?.click()}
          isLoading={upload.isPending}
        >
          <Upload size={14} />
          Attach
        </Button>
      </div>
      {(error || loadError) && (
        <p role="alert" className="text-xs text-rose-500">
          {error || apiError(loadError)}
        </p>
      )}
      {files.map((file) => (
        <article
          key={file.id}
          className="flex flex-wrap gap-3 items-center rounded-lg bg-slate-50 dark:bg-[#132428] p-3"
        >
          {file.mime_type.startsWith("image/") ? (
            <a href={file.file_path} target="_blank" rel="noreferrer">
              <img
                src={file.file_path}
                alt={file.filename}
                className="w-16 h-12 object-cover rounded"
              />
            </a>
          ) : (
            <FileText className="text-teal-500" size={28} />
          )}
          <div className="flex-1 min-w-0">
            <a
              href={file.file_path}
              download={file.filename}
              className="text-xs text-teal-600 dark:text-teal-300 break-all"
            >
              {file.filename}
            </a>
            <p className="text-[10px] text-slate-500">
              {Math.ceil(file.file_size / 1024)} KB ·{" "}
              {new Date(file.created_at).toLocaleDateString()}
            </p>
          </div>
          {file.mime_type.startsWith("image/") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                update.mutate({ id: card.id, cover_url: file.file_path })
              }
            >
              {card.cover_url === file.file_path ? "Cover" : "Use as cover"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleting(file.id)}
          >
            Remove
          </Button>
        </article>
      ))}
      {files.length === 0 && (
        <p className="text-xs text-slate-500">
          Attach documents or images to keep your task context together. Maximum
          file size: 10 MB.
        </p>
      )}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(undefined)}
        title="Remove this attachment?"
        description="The file and its attachment record will be removed."
        isDestructive
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting, {
            onSuccess: () => setDeleting(undefined),
            onError: (e) => setError(apiError(e)),
          })
        }
        isLoading={remove.isPending}
      />
    </section>
  );
}
