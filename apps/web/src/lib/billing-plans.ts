import SubscriptionCreatedEmail from "@parsertime/transactional/emails/subscription-created";
import SubscriptionDeletedEmail from "@parsertime/transactional/emails/subscription-deleted";
import SubscriptionUpdatedEmail from "@parsertime/transactional/emails/subscription-updated";
import { email } from "@/lib/email";
import { Logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  sendDiscordWebhook,
  userSubscribedWebhookConstructor,
  userUnsubscribedWebhookConstructor,
} from "@/lib/webhooks";
import type { BillingPlans } from "@/types/billing-plans";
import { $Enums } from "@/generated/prisma/browser";
import { render } from "@react-email/render";
import { get } from "@vercel/edge-config";
import type Stripe from "stripe";

type SubscriptionEvent =
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted";

async function resolveCurrentBillingPlan(
  customerId: string,
  billingPlans: BillingPlans
) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const current = subscriptions.data
    .filter((subscription) =>
      ["active", "trialing"].includes(subscription.status)
    )
    .sort((a, b) => b.created - a.created)[0];

  if (!current) return $Enums.BillingPlan.FREE;

  const productId = current.items.data[0]?.plan.product;
  if (typeof productId !== "string") return $Enums.BillingPlan.FREE;

  const billingPlan = billingPlans.find((plan) => plan.id === productId);
  return billingPlan?.name ?? $Enums.BillingPlan.FREE;
}

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  eventType: SubscriptionEvent
) {
  const subscription = event.data.object as Stripe.Subscription;

  const billingPlans = (await get<BillingPlans>("billingPlans")) ?? [];
  const currentBillingPlan = await resolveCurrentBillingPlan(
    subscription.customer as string,
    billingPlans
  );

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
          billingPlan: currentBillingPlan,
        },
      });

      Logger.info(`Subscription created: ${subscription.id}`, {
        customer: subscription.customer,
      });

      try {
        await email.sendEmail({
          to: user.email,
          from: "noreply@lux.dev",
          subject: `Thank you for subscribing to Parsertime!`,
          html: await render(
            SubscriptionCreatedEmail({ user, billingPlan: currentBillingPlan })
          ),
        });
        Logger.info("Subscription created email sent");

        const wh = userSubscribedWebhookConstructor(user, currentBillingPlan);
        await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);
      } catch (e) {
        Logger.error("Error sending email", e);
      }
      break;
    case "customer.subscription.updated":
      // only notify user if billing plan has changed
      if (currentBillingPlan === user.billingPlan) break;

      await prisma.user.update({
        where: {
          stripeId: subscription.customer as string,
        },
        data: {
          billingPlan: currentBillingPlan,
        },
      });

      Logger.info(`Subscription updated: ${subscription.id}`, {
        customer: subscription.customer,
      });

      // if the user was previously on a paid plan, send an email
      if (
        event.data.previous_attributes &&
        "items" in event.data.previous_attributes
      ) {
        try {
          await email.sendEmail({
            to: user.email,
            from: "noreply@lux.dev",
            subject: `Your Parsertime subscription has been updated`,
            html: await render(
              SubscriptionUpdatedEmail({
                user,
                billingPlan: currentBillingPlan,
              })
            ),
          });
          Logger.info("Subscription updated email sent");
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
          billingPlan: currentBillingPlan,
        },
      });

      Logger.info(`Subscription deleted: ${subscription.id}`, {
        customer: subscription.customer,
      });

      try {
        await email.sendEmail({
          to: user.email,
          from: "noreply@lux.dev",
          subject: `Your subscription to Parsertime has been cancelled`,
          html: await render(SubscriptionDeletedEmail({ user })),
        });
        Logger.info("Subscription deleted email sent");

        const wh = userUnsubscribedWebhookConstructor(user, currentBillingPlan);
        await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, wh);
      } catch (e) {
        Logger.error("Error sending email", e);
      }
      break;
  }
}
