import SubscriptionCreatedEmail from "@/components/email/subscription-created";
import SubscriptionDeletedEmail from "@/components/email/subscription-deleted";
import SubscriptionUpdatedEmail from "@/components/email/subscription-updated";
import { sendEmail } from "@/lib/email";
import Logger from "@/lib/logger";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { BillingPlans } from "@/types/billing-plans";
import { $Enums } from "@prisma/client";
import { render } from "@react-email/render";
import { get } from "@vercel/edge-config";
import Stripe from "stripe";

type SubscriptionEvent =
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted";

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  eventType: SubscriptionEvent
) {
  const subscription = event.data.object as Stripe.Subscription;

  const product = await stripe.products.retrieve(
    subscription.items.data[0].plan.product as string
  );

  const billingPlans = (await get<BillingPlans>("billingPlans")) ?? [];
  const billingPlan = billingPlans.find((plan) => plan.id === product.id);

  if (!billingPlan) {
    throw new Error("Billing plan not found");
  }

  const user = await prisma.user.findUnique({
    where: {
      stripeId: subscription.customer as string,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  switch (eventType) {
    case "customer.subscription.created":
      await prisma.user.update({
        where: {
          stripeId: subscription.customer as string,
        },
        data: {
          billingPlan: billingPlan.name,
        },
      });

      Logger.log("Subscription created", {
        id: subscription.id,
        customer: subscription.customer,
      });

      try {
        await sendEmail({
          to: user.email,
          from: "noreply@lux.dev",
          subject: `Thank you for subscribing to Parsertime!`,
          html: await render(
            SubscriptionCreatedEmail({ user, billingPlan: billingPlan.name })
          ),
        });
        Logger.log("Subscription created email sent");
      } catch (e) {
        Logger.error("Error sending email", e);
      }
      break;
    case "customer.subscription.updated":
      // only notify user if billing plan has changed
      if (billingPlan.name === user.billingPlan) break;

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

      // if the user was previously on a paid plan, send an email
      if (
        event.data.previous_attributes &&
        "items" in event.data.previous_attributes
      ) {
        try {
          await sendEmail({
            to: user.email,
            from: "noreply@lux.dev",
            subject: `Your Parsertime subscription has been updated`,
            html: await render(
              SubscriptionUpdatedEmail({ user, billingPlan: billingPlan.name })
            ),
          });
          Logger.log("Subscription updated email sent");
        } catch (e) {
          Logger.error("Error sending email", e);
        }
      }
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

      try {
        await sendEmail({
          to: user.email,
          from: "noreply@lux.dev",
          subject: `Your subscription to Parsertime has been cancelled`,
          html: await render(SubscriptionDeletedEmail({ user })),
        });
        Logger.log("Subscription deleted email sent");
      } catch (e) {
        Logger.error("Error sending email", e);
      }
      break;
  }
}
