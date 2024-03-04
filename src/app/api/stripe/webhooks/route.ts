/* eslint-disable no-case-declarations */
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import Logger from "@/lib/logger";
import { TODO } from "@/types/utils";
import { track } from "@vercel/analytics/server";
import { handleSubscriptionEvent } from "@/lib/billing-plans";

const relevantEvents = new Set([
  "product.created",
  "product.updated",
  "product.deleted",
  "price.created",
  "price.updated",
  "price.deleted",
  "checkout.session.completed",
  "customer.created",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") as string;
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
  } catch (err: TODO) {
    Logger.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "product.created":
        case "product.updated":
          Logger.log(event.data.object as Stripe.Product);
          break;
        case "price.created":
        case "price.updated":
          Logger.log(event.data.object as Stripe.Price);
          break;
        case "price.deleted":
          Logger.log(event.data.object as Stripe.Price);
          break;
        case "product.deleted":
          Logger.log(event.data.object as Stripe.Product);
          break;
        case "customer.created":
          const customer = event.data.object as Stripe.Customer;
          Logger.log("New customer", customer);
          await track("New Customer", { customerId: customer.id });
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionEvent(subscription, event.type);
          break;
        case "checkout.session.completed":
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === "subscription") {
            const subscriptionId = checkoutSession.subscription;
            Logger.log(
              subscriptionId as string,
              checkoutSession.customer as string,
              true
            );
          }
          break;
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
