"use client";

// Browser-only. Must NOT import server modules.
const SESSION_KEY = "pt_usage_session";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function track(
  name: string,
  opts?: { path?: string; teamId?: number; props?: Record<string, unknown> }
): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({
    name,
    path: opts?.path ?? window.location.pathname + window.location.search,
    teamId: opts?.teamId,
    sessionId: getSessionId(),
    props: opts?.props,
  });

  // sendBeacon survives page unload and never blocks navigation.
  const ok =
    typeof navigator.sendBeacon === "function" &&
    navigator.sendBeacon(
      "/api/usage/ingest",
      new Blob([payload], { type: "application/json" })
    );
  if (!ok) {
    void fetch("/api/usage/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }
}
