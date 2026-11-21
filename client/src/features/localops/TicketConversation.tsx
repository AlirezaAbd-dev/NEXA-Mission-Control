import { uiLabel } from "@/i18n";
import { dateLocale } from "@/i18n";
import { tr, useUiLocale } from "@/i18n";
import { useNavigate } from "react-router";
import { useBoard } from "@/hooks/board/useBoard";

import { useState } from "react";
import {
  Button,
  Textarea,
  Checkbox,
  CustomSelect,
  Modal,
} from "@/components/ui";
import { Markdown } from "@/components/common/Markdown";
import { useLocalResource } from "@/hooks/localops/useLocalResource";
import { useLocalMutation } from "@/hooks/localops/useLocalMutation";

import { apiError } from "@/lib/apiError";
import type { Ticket, Message } from "./types";
export function TicketConversation({
  projectId,
  ticket,
  canTriage,
  onClose,
}: {
  projectId: string;
  ticket: Ticket;
  canTriage: boolean;
  onClose: () => void;
}) {
  useUiLocale();
  const { data: messages = [], error: loadError } = useLocalResource<Message[]>(
      projectId,
      "tickets/" + ticket.id + "/messages",
    ),
    { data: members = [] } = useLocalResource<
      { user_id: string; display_name: string }[]
    >(projectId, "agents", canTriage),
    save = useLocalMutation(projectId);
  const navigate = useNavigate(),
    { data: board } = useBoard(projectId);
  const [column, setColumn] = useState("");
  const [body, setBody] = useState(""),
    [internal, setInternal] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    try {
      await save.mutateAsync({
        path: "tickets/" + ticket.id + "/messages",
        data: { body, internal },
      });
      setBody("");
      setError("");
    } catch (e) {
      setError(apiError(e));
    }
  }
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={ticket.title}
      description={tr("Requested by") + ticket.requester_name}
      size="2xl"
    >
      <div className="space-y-5">
        <Markdown text={ticket.body} />
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{tr("First reply due:")}{new Date(ticket.response_due_at).toLocaleString(dateLocale())}
          </span>
          <span>{tr("Resolution due:")}{" "}
            {new Date(ticket.resolution_due_at).toLocaleString(dateLocale())}
          </span>
        </div>
        {canTriage && (
          <div className="grid sm:grid-cols-3 gap-3">
            <CustomSelect
              label={tr("Status")}
              value={ticket.status}
              options={["new", "open", "pending", "resolved", "closed"].map(
                (x) => ({ value: x, label: uiLabel(x)}),
              )}
              onChange={(status) =>
                save.mutate({
                  path: "tickets",
                  data: {
                    id: ticket.id,
                    status,
                    assignee_id: ticket.assignee_id,
                    priority: ticket.priority,
                  },
                })
              }
            />
            <CustomSelect
              label={tr("Priority")}
              value={ticket.priority}
              options={["urgent", "high", "medium", "low", "no_priority"].map(
                (x) => ({ value: x, label: x.replace("_", " ") }),
              )}
              onChange={(priority) =>
                save.mutate({
                  path: "tickets",
                  data: {
                    id: ticket.id,
                    status: ticket.status,
                    assignee_id: ticket.assignee_id,
                    priority,
                  },
                })
              }
            />
            <CustomSelect
              label={tr("Agent")}
              value={ticket.assignee_id || ""}
              options={[
                { value: "", label: tr("Unassigned") },
                ...members.map((m) => ({
                  value: m.user_id,
                  label: m.display_name,
                })),
              ]}
              onChange={(assignee_id) =>
                save.mutate({
                  path: "tickets",
                  data: {
                    id: ticket.id,
                    status: ticket.status,
                    priority: ticket.priority,
                    assignee_id: assignee_id || null,
                  },
                })
              }
            />
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {ticket.card_id ? (
            <Button
              variant="outline"
              onClick={() =>
                navigate("/p/" + projectId + "/board?card=" + ticket.card_id)
              }
            >{tr("Open linked task")}</Button>
          ) : (
            canTriage && (
              <>
                <CustomSelect
                  placeholder={tr("Task destination")}
                  value={column}
                  onChange={setColumn}
                  options={(board?.columns || []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
                <Button
                  variant="outline"
                  disabled={!column}
                  onClick={() =>
                    save.mutate({
                      path: "tickets/" + ticket.id + "/task",
                      data: { column_id: column },
                    })
                  }
                >{tr("Create linked task")}</Button>
              </>
            )
          )}
        </div>
        <h3 className="font-semibold">{tr("Conversation")}</h3>
        {loadError && (
          <p role="alert" className="text-danger">
            {apiError(loadError)}
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "rounded-xl border p-4 space-y-2 " +
              (m.internal
                ? "border-warning/30 bg-warning/5"
                : "border-border bg-muted/30")
            }
          >
            <p className="text-xs text-muted-foreground">
              {m.author || tr("Former member")} ·{" "}
              {new Date(m.created_at).toLocaleString(dateLocale())}
              {m.internal ? tr("· Staff note") : ""}
            </p>
            <Markdown text={m.body} />
          </div>
        ))}
        {!messages.length && (
          <p className="text-sm text-muted-foreground">{tr("No replies yet. Add context or ask a question below.")}</p>
        )}
        <Textarea
          label={internal ? tr("Staff note") : tr("Reply")}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {canTriage && (
          <Checkbox
            label={tr("Internal note · desk agents only")}
            checked={internal}
            onChange={setInternal}
          />
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button
          disabled={!body.trim()}
          isLoading={save.isPending}
          onClick={() => void submit()}
        >{tr("Send")}{internal ? "note" : "reply"}
        </Button>
      </div>
    </Modal>
  );
}
