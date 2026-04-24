import { stripeWebhookCounter } from "@/lib/axiom/metrics";
import { handleSubscriptionEvent } from "@/lib/billing-plans";
import {
  clearPendingAutoRefill,
  creditUser,
  saveDefaultPaymentMethod,
} from "@/lib/credits";
import { Logger } from "@/lib/logger";
import { stripe } from "@/lib/stripe";
import { track } from "@vercel/analytics/server";
import type Stripe from "stripe";

const relevantEvents = new Set([
  "customer.created",
  "customer.deleted",
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.deleted",
  "customer.subscription.updated",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;
  const webhookSecret =
    process.env.NODE_ENV === "production"
      ? process.env.STRIPE_WEBHOOK_SECRET
      : process.env.STRIPE_WEBHOOK_SECRET_LOCAL;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret)
      return new Response("Webhook secret not found.", { status: 400 });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    Logger.info(`🔔  Webhook received: ${event.type}`);
  } catch (err) {
    if (err instanceof Error) {
      Logger.error(`❌ Error message: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
    return new Response(`Unknown error`, { status: 400 });
  }

  stripeWebhookCounter.add(1, { event_type: event.type });

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "customer.created": {
          const customer = event.data.object;
          Logger.info(`New customer: ${customer.id}`);
          await track("New Customer", { customerId: customer.id });
          break;
        }
        case "customer.deleted":
          Logger.info(`Deleted customer: ${event.data.object.id}`);
          await track("Deleted Customer", { customerId: event.data.object.id });
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await handleSubscriptionEvent(event, event.type);
          break;
        case "checkout.session.completed": {
          const checkoutSession = event.data.object;
          if (checkoutSession.mode === "subscription") {
            const subscriptionId = checkoutSession.subscription;
            Logger.log(
              subscriptionId as string,
              checkoutSession.customer as string,
              true
            );
          } else if (
            checkoutSession.mode === "payment" &&
            checkoutSession.metadata?.type === "ai_chat_topup"
          ) {
            await handleTopupCheckoutCompleted(checkoutSession, event.id);
          }
          break;
        }
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          if (paymentIntent.metadata?.type === "ai_chat_auto_refill") {
            await handleAutoRefillSucceeded(paymentIntent, event.id);
          }
          break;
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object;
          if (paymentIntent.metadata?.type === "ai_chat_auto_refill") {
            await handleAutoRefillFailed(paymentIntent);
          }
          break;
        }
        default:
          throw new Error("Unhandled relevant event!");
      }
    } catch (error) {
      Logger.error(error);
      return new Response(
        "Webhook handler failed. View your Next.js function logs.",
        {
          status: 400,
        }
      );
    }
  } else {
    return new Response(`Unsupported event type: ${event.type}`, {
      status: 400,
    });
  }
  return new Response(JSON.stringify({ received: true }));
}

async function handleTopupCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const userId = session.metadata?.userId;
  const amountCents = session.amount_total ?? 0;

  if (!userId || amountCents <= 0) {
    Logger.warn("topup checkout missing userId or amount", {
      sessionId: session.id,
    });
    return;
  }

  const result = await creditUser(userId, {
    amountCents,
    type: "TOPUP",
    description: `Top-up via Stripe Checkout (${session.id})`,
    stripeEventId: eventId,
    metadata: { sessionId: session.id },
  });

  if (!result.ok) {
    Logger.info("topup checkout event already processed", {
      eventId,
      userId,
    });
    return;
  }

  if (typeof session.payment_intent === "string") {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent
      );
      const paymentMethodId =
        typeof paymentIntent.payment_method === "string"
          ? paymentIntent.payment_method
          : paymentIntent.payment_method?.id;
      if (paymentMethodId) {
        await saveDefaultPaymentMethod(userId, paymentMethodId);
      }
    } catch (error) {
      Logger.warn("failed to save payment method from topup", {
        userId,
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function handleAutoRefillSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  const userId = paymentIntent.metadata?.userId;
  const amountCents = paymentIntent.amount_received ?? paymentIntent.amount;

  if (!userId || amountCents <= 0) {
    Logger.warn("auto-refill payment missing userId or amount", {
      paymentIntentId: paymentIntent.id,
    });
    return;
  }

  const result = await creditUser(userId, {
    amountCents,
    type: "AUTO_REFILL",
    description: `Auto-refill via Stripe PaymentIntent (${paymentIntent.id})`,
    stripeEventId: eventId,
    metadata: { paymentIntentId: paymentIntent.id },
  });

  if (!result.ok) {
    Logger.info("auto-refill event already processed", {
      eventId,
      userId,
    });
  }

  await clearPendingAutoRefill(userId);
}

async function handleAutoRefillFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.userId;
  if (!userId) return;
  Logger.warn("auto-refill payment failed", {
    paymentIntentId: paymentIntent.id,
    userId,
  });
  await clearPendingAutoRefill(userId);
}
