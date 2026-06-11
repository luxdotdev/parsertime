// Single source of truth for v1 usage event names. Dotted taxonomy mirrors
// the existing Axiom counter names so "a feature was used" has one definition.
export const UsageEventName = {
  PAGE_VIEW: "page_view",
  SIGNUP: "auth.signup",
  SIGNIN: "auth.signin",
  TEAM_CREATE: "team.create",
  SCRIM_CREATE: "scrim.create",
  SCRIM_MAP_ADD: "scrim.map_add",
  AI_CHAT_MESSAGE: "ai.chat.message",
  MATCHMAKER_REQUEST: "matchmaker.request",
  TOURNAMENT_CREATE: "tournament.create",
  STATS_VIEW: "stats.view",
} as const;

export type UsageEventName =
  (typeof UsageEventName)[keyof typeof UsageEventName];
