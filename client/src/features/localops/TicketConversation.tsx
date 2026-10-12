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
      description={"Requested by " + ticket.requester_name}
      size="2xl"
    >
      <div className="space-y-5">
        <Markdown text={ticket.body} />
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            First reply due: {new Date(ticket.response_due_at).toLocaleString()}
          </span>
          <span>
            Resolution due:{" "}
            {new Date(ticket.resolution_due_at).toLocaleString()}
          </span>
        </div>
        {canTriage && (
          <div className="grid sm:grid-cols-3 gap-3">
            <CustomSelect
              label="Status"
              value={ticket.status}
              options={["new", "open", "pending", "resolved", "closed"].map(
                (x) => ({ value: x, label: x }),
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
              label="Priority"
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
              label="Agent"
              value={ticket.assignee_id || ""}
              options={[
                { value: "", label: "Unassigned" },
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
            >
              Open linked task
            </Button>
          ) : (
            canTriage && (
              <>
                <CustomSelect
                  placeholder="Task destination"
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
                >
                  Create linked task
                </Button>
              </>
            )
          )}
        </div>
        <h3 className="font-semibold">Conversation</h3>
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
              {m.author || "Former member"} ·{" "}
              {new Date(m.created_at).toLocaleString()}
              {m.internal ? " · Staff note" : ""}
            </p>
            <Markdown text={m.body} />
          </div>
        ))}
        {!messages.length && (
          <p className="text-sm text-muted-foreground">
            No replies yet. Add context or ask a question below.
          </p>
        )}
        <Textarea
          label={internal ? "Staff note" : "Reply"}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {canTriage && (
          <Checkbox
            label="Internal note · desk agents only"
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
        >
          Send {internal ? "note" : "reply"}
        </Button>
      </div>
    </Modal>
  );
}
