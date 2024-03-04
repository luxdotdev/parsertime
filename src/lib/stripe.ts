import { Stripe as StripeType, loadStripe } from "@stripe/stripe-js";
import Stripe from "stripe";

let stripePromise: Promise<StripeType | null>;
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
  // Register this as an official Stripe plugin.
  // https://stripe.com/docs/building-plugins#setappinfo
  appInfo: {
    name: "Next.js Subscription Starter",
    version: "0.0.0",
    url: "https://github.com/vercel/nextjs-subscription-payments",
  },
});
