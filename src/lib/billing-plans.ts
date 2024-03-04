import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { $Enums } from "@prisma/client";
import { get } from "@vercel/edge-config";
import Stripe from "stripe";

type SubscriptionEvent =
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted";

type BillingPlans = {
  id: string;
  name: $Enums.BillingPlan;
  price: number;
  teamSize: number;
}[];

export async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  eventType: SubscriptionEvent
) {
  const product = await stripe.products.retrieve(
    subscription.items.data[0].plan.product as string
  );

  const billingPlans = (await get("billingPlans")) as BillingPlans;
  const billingPlan = billingPlans.find((plan) => plan.id === product.id);

  if (!billingPlan) {
    throw new Error("Billing plan not found");
  }

  switch (eventType) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await prisma.user.update({
        where: {
          stripeId: subscription.customer as string,
        },
        data: {
          billingPlan: billingPlan.name,
        },
      });

      Logger.log("Subscription updated", {
        id: subscription.id,
        customer: subscription.customer,
      });
      break;
    case "customer.subscription.deleted":
      await prisma.user.update({
        where: {
          stripeId: subscription.customer as string,
        },
        data: {
          billingPlan: $Enums.BillingPlan.FREE,
        },
      });

      Logger.log("Subscription deleted", {
        id: subscription.id,
        customer: subscription.customer,
      });
      break;
  }
}
