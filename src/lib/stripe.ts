import { Stripe as TStripe, loadStripe } from "@stripe/stripe-js";
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
