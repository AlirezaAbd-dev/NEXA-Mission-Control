import type { Ticket } from "./types";
export function isSlaBreached(
  t: Pick<
    Ticket,
    "status" | "responded_at" | "response_due_at" | "resolution_due_at"
  >,
  now = Date.now(),
) {
  if (["resolved", "closed"].includes(t.status)) return false;
  return (
    (!t.responded_at && Date.parse(t.response_due_at) < now) ||
    Date.parse(t.resolution_due_at) < now
  );
}
