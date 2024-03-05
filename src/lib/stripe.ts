import { getUser } from "@/data/user-dto";
import { BillingPlans } from "@/types/billing-plans";
import { Stripe as TStripe, loadStripe } from "@stripe/stripe-js";
import { get } from "@vercel/edge-config";
import { Session } from "next-auth";
import Stripe from "stripe";

let stripePromise: Promise<TStripe | null>;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

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

  if (!session || !session.user || !session.user.email) {
    throw new Error("Unauthorized");
  }

  const user = await getUser(session.user.email);

  if (!user) {
    throw new Error("Unauthorized");
  }

  const billingPlans = (await get("billingPlans")) as BillingPlans;
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
  });

  if (!checkoutSession.url) {
    throw new Error("Error creating checkout session");
  }

  return checkoutSession;
}
