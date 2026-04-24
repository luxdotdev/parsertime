import "server-only";

import {
  DEFAULT_AUTO_REFILL_AMOUNT_CENTS,
  DEFAULT_AUTO_REFILL_THRESHOLD_CENTS,
  shouldTriggerAutoRefill,
} from "@/lib/chat-pricing";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type {
  CreditTransactionType,
  Prisma,
  UserCredits,
} from "@prisma/client";

export type UserCreditsSnapshot = UserCredits;

export async function getOrInitUserCredits(
  userId: string
): Promise<UserCreditsSnapshot> {
  return prisma.userCredits.upsert({
    where: { userId },
    create: {
      userId,
      balanceCents: 0,
      autoRefillEnabled: false,
      autoRefillThresholdCents: DEFAULT_AUTO_REFILL_THRESHOLD_CENTS,
      autoRefillAmountCents: DEFAULT_AUTO_REFILL_AMOUNT_CENTS,
    },
    update: {},
  });
}

export async function getUserBalance(userId: string): Promise<number> {
  const credits = await prisma.userCredits.findUnique({
    where: { userId },
    select: { balanceCents: true },
  });
  return credits?.balanceCents ?? 0;
}

type CreditArgs = {
  amountCents: number;
  type: Extract<
    CreditTransactionType,
    "TOPUP" | "AUTO_REFILL" | "REFUND" | "ADJUSTMENT"
  >;
  description: string;
  stripeEventId?: string;
  metadata?: Prisma.InputJsonValue;
};

export type CreditResult =
  | { ok: true; balanceAfterCents: number; transactionId: number }
  | { ok: false; reason: "duplicate" };

export async function creditUser(
  userId: string,
  args: CreditArgs
): Promise<CreditResult> {
  if (args.amountCents <= 0) {
    throw new Error("credit amount must be positive");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.userCredits.upsert({
        where: { userId },
        create: {
          userId,
          balanceCents: args.amountCents,
          autoRefillThresholdCents: DEFAULT_AUTO_REFILL_THRESHOLD_CENTS,
          autoRefillAmountCents: DEFAULT_AUTO_REFILL_AMOUNT_CENTS,
        },
        update: { balanceCents: { increment: args.amountCents } },
        select: { balanceCents: true },
      });

      const txn = await tx.creditTransaction.create({
        data: {
          userId,
          type: args.type,
          amountCents: args.amountCents,
          balanceAfterCents: updated.balanceCents,
          description: args.description,
          stripeEventId: args.stripeEventId,
          metadata: args.metadata,
        },
        select: { id: true },
      });

      return {
        ok: true as const,
        balanceAfterCents: updated.balanceCents,
        transactionId: txn.id,
      };
    });
  } catch (error) {
    if (isUniqueConstraintOn(error, "stripeEventId")) {
      return { ok: false, reason: "duplicate" };
    }
    throw error;
  }
}

type ChargeArgs = {
  amountCents: number;
  description: string;
  metadata?: Prisma.InputJsonValue;
};

export type ChargeResult = {
  balanceAfterCents: number;
  transactionId: number;
  autoRefillTriggered: boolean;
};

export async function chargeUser(
  userId: string,
  args: ChargeArgs
): Promise<ChargeResult> {
  if (args.amountCents <= 0) {
    throw new Error("charge amount must be positive");
  }

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.userCredits.upsert({
      where: { userId },
      create: {
        userId,
        balanceCents: 0,
        autoRefillThresholdCents: DEFAULT_AUTO_REFILL_THRESHOLD_CENTS,
        autoRefillAmountCents: DEFAULT_AUTO_REFILL_AMOUNT_CENTS,
      },
      update: {},
    });

    const balanceAfterCents = before.balanceCents - args.amountCents;

    await tx.userCredits.update({
      where: { userId },
      data: { balanceCents: balanceAfterCents },
    });

    const txn = await tx.creditTransaction.create({
      data: {
        userId,
        type: "CHARGE",
        amountCents: -args.amountCents,
        balanceAfterCents,
        description: args.description,
        metadata: args.metadata,
      },
      select: { id: true },
    });

    return {
      balanceAfterCents,
      transactionId: txn.id,
      autoRefillTriggered: shouldTriggerAutoRefill({
        enabled: before.autoRefillEnabled,
        hasPaymentMethod: !!before.stripePaymentMethodId,
        beforeCents: before.balanceCents,
        afterCents: balanceAfterCents,
        thresholdCents: before.autoRefillThresholdCents,
      }),
    };
  });

  return result;
}

export async function attemptAutoRefill(
  userId: string
): Promise<
  | { ok: true; paymentIntentId: string }
  | { ok: false; reason: "no_method" | "disabled" | "stripe_error" | "no_user" }
> {
  const [credits, user] = await Promise.all([
    prisma.userCredits.findUnique({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { stripeId: true },
    }),
  ]);

  if (!credits) return { ok: false, reason: "no_user" };
  if (!credits.autoRefillEnabled) return { ok: false, reason: "disabled" };
  if (!credits.stripePaymentMethodId || !user?.stripeId) {
    return { ok: false, reason: "no_method" };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: credits.autoRefillAmountCents,
      currency: "usd",
      customer: user.stripeId,
      payment_method: credits.stripePaymentMethodId,
      confirm: true,
      off_session: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        type: "ai_chat_auto_refill",
        userId,
      },
    });
    return { ok: true, paymentIntentId: paymentIntent.id };
  } catch (error) {
    Logger.error("auto-refill payment failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: "stripe_error" };
  }
}

export async function setAutoRefillConfig(
  userId: string,
  config: {
    enabled?: boolean;
    thresholdCents?: number;
    amountCents?: number;
  }
): Promise<UserCreditsSnapshot> {
  return prisma.userCredits.upsert({
    where: { userId },
    create: {
      userId,
      balanceCents: 0,
      autoRefillEnabled: config.enabled ?? false,
      autoRefillThresholdCents:
        config.thresholdCents ?? DEFAULT_AUTO_REFILL_THRESHOLD_CENTS,
      autoRefillAmountCents:
        config.amountCents ?? DEFAULT_AUTO_REFILL_AMOUNT_CENTS,
    },
    update: {
      ...(config.enabled !== undefined && {
        autoRefillEnabled: config.enabled,
      }),
      ...(config.thresholdCents !== undefined && {
        autoRefillThresholdCents: config.thresholdCents,
      }),
      ...(config.amountCents !== undefined && {
        autoRefillAmountCents: config.amountCents,
      }),
    },
  });
}

export async function saveDefaultPaymentMethod(
  userId: string,
  stripePaymentMethodId: string
): Promise<void> {
  await prisma.userCredits.upsert({
    where: { userId },
    create: {
      userId,
      balanceCents: 0,
      stripePaymentMethodId,
    },
    update: { stripePaymentMethodId },
  });
}

function isUniqueConstraintOn(error: unknown, field: string): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    const target = (error as { meta?: { target?: string[] | string } }).meta
      ?.target;
    if (Array.isArray(target)) return target.includes(field);
    if (typeof target === "string") return target.includes(field);
  }
  return false;
}
