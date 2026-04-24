import { AppRuntime } from "@/data/runtime";
import { UserService } from "@/data/user";
import type { BillingPlans } from "@/types/billing-plans";
import type { User } from "@prisma/client";
import { get } from "@vercel/edge-config";
import { Effect } from "effect";
import type { Session } from "next-auth";
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // https://github.com/stripe/stripe-node#configuration
  // https://stripe.com/docs/api/versioning
  // @ts-expect-error - Use latest Stripe API version
  apiVersion: null,
});

export async function createCheckout(
  session: Session | null,
  planName: string
) {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://parsertime.app"
      : "http://localhost:3000";

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );

  if (!user) {
    throw new Error("Unauthorized");
  }

  const billingPlans = (await get<BillingPlans>("billingPlans")) ?? [];
  const billingPlan = billingPlans.find(
    (plan) => plan.name === planName.toUpperCase()
  );

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: user.stripeId!,
    line_items: [
      {
        price: billingPlan?.priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/pricing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
    subscription_data: {
      metadata: {
        userId: user.id,
      },
    },
    allow_promotion_codes: true,
  });

  if (!checkoutSession.url) {
    throw new Error("Error creating checkout session");
  }

  return checkoutSession;
}

export async function createTopupCheckout(
  session: Session | null,
  amountCents: number
) {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://parsertime.app"
      : "http://localhost:3000";

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await AppRuntime.runPromise(
    UserService.pipe(Effect.flatMap((svc) => svc.getUser(session.user.email)))
  );

  if (!user?.stripeId) {
    throw new Error("Unauthorized");
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: user.stripeId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: "Parsertime AI Chat credits",
            description: "Credits for pay-as-you-go AI analyst usage.",
          },
        },
      },
    ],
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: {
        type: "ai_chat_topup",
        userId: user.id,
        amountCents: String(amountCents),
      },
    },
    metadata: {
      type: "ai_chat_topup",
      userId: user.id,
      amountCents: String(amountCents),
    },
    success_url: `${baseUrl}/chat?topup=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/chat?topup=cancel`,
  });

  if (!checkoutSession.url) {
    throw new Error("Error creating topup checkout session");
  }

  return checkoutSession;
}

export async function getCustomerPortalUrl(user: User) {
  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://parsertime.app"
      : "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeId!,
    return_url: `${baseUrl}/settings`,
  });

  return session.url;
}
