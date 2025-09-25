import { handleSubscriptionEvent } from "@/lib/billing-plans";
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
    Logger.log(`🔔  Webhook received: ${event.type}`);
  } catch (err) {
    if (err instanceof Error) {
      Logger.log(`❌ Error message: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
    return new Response(`Unknown error`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "customer.created": {
          const customer = event.data.object;
          Logger.log("New customer", customer);
          await track("New Customer", { customerId: customer.id });
          break;
        }
        case "customer.deleted":
          Logger.log("Deleted customer", event.data.object);
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
          }
          break;
        }
        default:
          throw new Error("Unhandled relevant event!");
      }
    } catch (error) {
      Logger.log(error);
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
