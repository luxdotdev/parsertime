import type { BillingPlan } from "@prisma/client";

export const TEAM_CREATION_LIMIT = {
  FREE: 2,
  BASIC: 5,
  PREMIUM: 10,
} as const satisfies Record<BillingPlan, number>;

export const TEAM_MEMBER_LIMIT = {
  FREE: 5,
  BASIC: 10,
  PREMIUM: 20,
} as const satisfies Record<BillingPlan, number>;

export const SCRIM_CREATION_LIMIT = {
  FREE: Infinity,
  BASIC: Infinity,
  PREMIUM: Infinity,
} as const satisfies Record<BillingPlan, number>;
