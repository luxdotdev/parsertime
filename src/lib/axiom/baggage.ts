import {
  type BaggageEntry,
  type Context,
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
 * Builds OTel baggage for request context and sets matching attributes on the
 * active span. The returned context must be passed to context.with() or
 * propagation.inject() by the caller.
 */
export function setRequestContext(attrs: BaggageAttrs): Context {
  const entries: Record<string, BaggageEntry> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) {
      entries[key] = { value };
    }
  }

  const bag = propagation.createBaggage(entries);
  const ctx = propagation.setBaggage(context.active(), bag);

  // Also set as span attributes so they appear in traces
  const span = trace.getActiveSpan();
  if (span) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined) {
        span.setAttribute(`app.${key}`, value);
      }
    }
  }

  return ctx;
}

/**
 * Runs work with request baggage active so downstream OpenTelemetry propagation
 * can read the user/team/flag values from context.active().
 */
export function withRequestContext<T>(
  attrs: BaggageAttrs,
  fn: () => T
): T {
  return context.with(setRequestContext(attrs), fn);
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
