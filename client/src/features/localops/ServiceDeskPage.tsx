import { uiLabel } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import { useState } from "react";
import { useParams } from "react-router";
import {
  Button,
  Input,
  Textarea,
  Modal,
  CustomSelect,
  Badge,
} from "@/components/ui";
import { ViewTabs } from "@/features/views/ViewTabs";
import { useLocalResource } from "@/hooks/localops/useLocalResource";
import { useLocalMutation } from "@/hooks/localops/useLocalMutation";
import { apiError } from "@/lib/apiError";
import { TicketConversation } from "./TicketConversation";
import { KnowledgeBase } from "./KnowledgeBase";
import type { Session, Ticket } from "./types";
import { isSlaBreached as breached } from "./deskMetrics";
export function ServiceDeskPage() {
  useUiLocale();
  const { projectId = "" } = useParams();
  const { data: session } = useLocalResource<Session>(projectId, "session"),
    { data: tickets = [], error: loadError } = useLocalResource<Ticket[]>(
      projectId,
      "tickets",
    ),
    save = useLocalMutation(projectId);
  const [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [active, setActive] = useState(""),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [priority, setPriority] = useState("medium"),
    [error, setError] = useState(""),
    [page, setPage] = useState(0);
  const chosen = tickets.find((t) => t.id === active),
    filtered = tickets.filter(
      (t) =>
        (!status ||
          (status === "breached" ? breached(t) : t.status === status)) &&
        (t.title + " " + t.body + " " + t.requester_name)
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
  async function submit() {
    try {
      const result = await save.mutateAsync({
        path: "tickets",
        data: { title, body, priority },
      });
      setOpen(false);
      setTitle("");
      setBody("");
      setActive(result.id || "");
      setError("");
    } catch (e) {
      setError(apiError(e));
    }
  }
  return (
    <div className="p-4 md:p-6 space-y-5 min-h-full flex-1 flex flex-col">
      <ViewTabs projectId={projectId} />
      <header className="flex flex-wrap justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold">{tr("Service desk")}</h1>
          <p className="text-muted-foreground text-sm">
            {session?.can_triage
              ? tr("Manage requests, first replies, resolutions and shared answers.")
              : tr("Submit requests, track your conversations and browse published guides.")}
          </p>
        </div>
        <Button
          onClick={() => {
            setOpen(true);
            setError("");
          }}
        >{tr("New request")}</Button>
      </header>
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          [
            tr("Open"),
            tickets.filter((t) => !["resolved", "closed"].includes(t.status))
              .length,
          ],
          [tr("Waiting"), tickets.filter((t) => t.status === "pending").length],
          [tr("SLA overdue"), tickets.filter((t) => breached(t)).length],
        ].map(([name, value]) => (
          <div
            key={name}
            className="border border-border rounded-2xl bg-card p-4"
          >
            <p className="text-sm text-muted-foreground">{name}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          placeholder={tr("Search requests…")}
          aria-label={tr("Search requests")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <CustomSelect
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
          options={[
            { value: "", label: tr("All statuses") },
            ...["new", "open", "pending", "resolved", "closed", "breached"].map(
              (value) => ({
                value,
                label: value === "breached" ? tr("SLA overdue") : uiLabel(value),
              }),
            ),
          ]}
        />
      </div>
      {loadError && (
        <p role="alert" className="text-danger">
          {apiError(loadError)}
        </p>
      )}
      <div className="space-y-2">
        {filtered.slice(page * 50, page * 50 + 50).map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-3 border border-border rounded-xl bg-card p-3"
          >
            <Button
              variant="ghost"
              className="flex-1 justify-start whitespace-normal text-start"
              onClick={() => setActive(t.id)}
            >
              {t.title}
            </Button>
            <Badge
              variant={
                ["resolved", "closed"].includes(t.status)
                  ? "success"
                  : t.status === "pending"
                    ? "warning"
                    : "primary"
              }
            >
              {t.status}
            </Badge>
            <Badge variant={breached(t) ? "danger" : "default"}>
              {breached(t) ? tr("SLA overdue") : t.priority}
            </Badge>
            {session?.can_triage && (
              <span className="text-xs text-muted-foreground">
                {t.requester_name}
              </span>
            )}
          </div>
        ))}
      </div>
      {!filtered.length && (
        <div className="border border-dashed border-border rounded-2xl p-10 text-center">
          <h2 className="font-semibold">{tr("No matching requests")}</h2>
          <p className="text-sm text-muted-foreground">{tr("Create a request or adjust the filters to begin.")}</p>
        </div>
      )}
      {filtered.length > 50 && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >{tr("Previous")}</Button>
          <span>{tr("Page")}{" "}{page + 1}</span>
          <Button
            variant="outline"
            disabled={(page + 1) * 50 >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >{tr("Next")}</Button>
        </div>
      )}
      <KnowledgeBase
        projectId={projectId}
        canEdit={!!session?.can_triage}
        canManage={!!session?.can_manage}
      />
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={tr("New service request")}
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label={tr("Title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label={tr("Describe the issue")}
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <CustomSelect
            label={tr("Priority")}
            value={priority}
            onChange={setPriority}
            options={["urgent", "high", "medium", "low"].map((value) => ({
              value,
              label: uiLabel(value),
            }))}
          />
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <Button
            disabled={!title.trim()}
            isLoading={save.isPending}
            onClick={() => void submit()}
          >{tr("Submit request")}</Button>
        </div>
      </Modal>
      {chosen && (
        <TicketConversation
          key={chosen.id}
          projectId={projectId}
          ticket={chosen}
          canTriage={!!session?.can_triage}
          onClose={() => setActive("")}
        />
      )}
    </div>
  );
}
