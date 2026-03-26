import {
  type BaggageEntry,
  context,
  propagation,
  trace,
} from "@opentelemetry/api";

type BaggageAttrs = {
  user_id: string;
  billing_plan: string;
  team_ids?: string;
  flags?: string;
};

/**
 * Sets OTel baggage and span attributes for the current request context.
 * Call this after auth() in route handlers to propagate user/team/flag
 * context through traces, logs, and downstream service calls.
 */
export function setRequestContext(attrs: BaggageAttrs) {
  const entries: Record<string, BaggageEntry> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) {
      entries[key] = { value };
    }
  }

  const bag = propagation.createBaggage(entries);
  const ctx = propagation.setBaggage(context.active(), bag);
  context.with(ctx, () => {
    /* empty */
  });

  // Also set as span attributes so they appear in traces
  const span = trace.getActiveSpan();
  if (span) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined) {
        span.setAttribute(`app.${key}`, value);
      }
    }
  }
}

/**
 * Builds a compact flags string for baggage from resolved feature flags.
 * Only includes enabled flags to keep the value small.
 *
 * Example output: "ai-chat,scouting-tool,tempo-chart"
 */
export function flagsToBaggage(
  flagValues: Record<string, boolean>
): string | undefined {
  const enabled = Object.entries(flagValues)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return enabled.length > 0 ? enabled.join(",") : undefined;
}
