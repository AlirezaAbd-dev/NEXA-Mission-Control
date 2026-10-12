import { useState } from "react";
import { Button, Input, Textarea, Modal, Checkbox } from "@/components/ui";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { Markdown } from "@/components/common/Markdown";
import { useLocalResource } from "@/hooks/localops/useLocalResource";
import { useLocalMutation } from "@/hooks/localops/useLocalMutation";
import { apiError } from "@/lib/apiError";
import type { Article } from "./types";
export function KnowledgeBase({
  projectId,
  canEdit,
  canManage,
}: {
  projectId: string;
  canEdit: boolean;
  canManage: boolean;
}) {
  const { data: articles = [], error: loadError } = useLocalResource<Article[]>(
      projectId,
      "articles",
    ),
    save = useLocalMutation(projectId);
  const [search, setSearch] = useState(""),
    [editor, setEditor] = useState<Article | null | undefined>(),
    [preview, setPreview] = useState<Article>(),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [published, setPublished] = useState(false),
    [error, setError] = useState(""),
    [remove, setRemove] = useState<Article>();
  async function submit() {
    try {
      await save.mutateAsync({
        path: "articles",
        data: { id: editor?.id, title, body, published },
      });
      setEditor(undefined);
      setError("");
    } catch (e) {
      setError(apiError(e));
    }
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex justify-between gap-3">
        <h2 className="font-bold">Knowledge base</h2>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => {
              setEditor(null);
              setTitle("");
              setBody("");
              setPublished(false);
              setError("");
            }}
          >
            New article
          </Button>
        )}
      </div>
      <Input
        aria-label="Search knowledge base"
        placeholder="Search articles…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loadError && (
        <p role="alert" className="text-danger">
          {apiError(loadError)}
        </p>
      )}
      {articles
        .filter((a) =>
          (a.title + " " + a.body).toLowerCase().includes(search.toLowerCase()),
        )
        .map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 border-b border-border pb-3"
          >
            <Button
              variant="ghost"
              className="flex-1 justify-start whitespace-normal text-start"
              onClick={() => setPreview(a)}
            >
              {a.title}
              {!a.published && " · Draft"}
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditor(a);
                  setTitle(a.title);
                  setBody(a.body);
                  setPublished(!!a.published);
                  setError("");
                }}
              >
                Edit
              </Button>
            )}
            {canManage && (
              <Button size="sm" variant="ghost" onClick={() => setRemove(a)}>
                Delete
              </Button>
            )}
          </div>
        ))}
      {!articles.length && (
        <p className="text-sm text-muted-foreground">
          Published guides will appear here to help resolve requests.
        </p>
      )}
      <Modal
        isOpen={editor !== undefined}
        onClose={() => setEditor(undefined)}
        title="Knowledge article"
        size="2xl"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label="Content (Markdown)"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Checkbox
            label="Publish to project members"
            checked={published}
            onChange={setPublished}
          />
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <Button
            disabled={!title.trim() || !body.trim()}
            isLoading={save.isPending}
            onClick={() => void submit()}
          >
            Save article
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(undefined)}
        title={preview?.title}
        size="2xl"
      >
        {preview && <Markdown text={preview.body} />}
      </Modal>
      <ConfirmModal
        isOpen={!!remove}
        onClose={() => setRemove(undefined)}
        title="Delete article"
        description="The article will be removed from the knowledge base."
        isDestructive
        onConfirm={() => {
          if (remove)
            save.mutate(
              { path: "articles/" + remove.id, method: "delete" },
              { onSuccess: () => setRemove(undefined) },
            );
        }}
      />
    </section>
  );
}
