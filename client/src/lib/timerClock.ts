// Server timestamps establish elapsed duration; a monotonic browser clock advances it.
// Never subtract timestamps produced by different machines' wall clocks.
export function anchorTimer(timer: { started_at: string; server_now: string }, receivedAt: number) {
  const started = Date.parse(timer.started_at);
  const serverNow = Date.parse(timer.server_now);
  if (!Number.isFinite(started) || !Number.isFinite(serverNow)) {
    throw new Error("Cannot synchronize timer. Update the API server and try again.");
  }
  return { elapsed_ms: Math.max(0, serverNow - started), received_at: receivedAt };
}
export function timerElapsedSeconds(timer: { elapsed_ms: number; received_at: number }, tick: number) {
  return Math.floor((timer.elapsed_ms + Math.max(0, tick - timer.received_at)) / 1000);
}
