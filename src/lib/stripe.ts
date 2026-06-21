import "server-only";
import Stripe from "stripe";

// Lazily-instantiated Stripe client. We must NOT construct `new Stripe()` at
// module load: the Stripe SDK throws when the secret key is absent, which would
// break `next build` page-data collection in environments without the key set.
// getStripe() constructs on first use and memoizes on globalThis (so hot reload
// in dev doesn't pile up clients).
const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

export function getStripe(): Stripe {
  if (globalForStripe.stripe) return globalForStripe.stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const client = new Stripe(key, {
    typescript: true,
    appInfo: { name: "FanFic Lab", url: "https://fanfic-lab.tech" },
  });
  globalForStripe.stripe = client;
  return client;
}

/** True when a Stripe secret key is configured (used to gate checkout UI/routes). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
