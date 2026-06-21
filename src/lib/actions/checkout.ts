"use server";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { requireDbUser } from "@/lib/api-auth";
import { getPack, totalCredits } from "@/lib/billing/packs";
import { AppError, ErrorCode } from "@/lib/errors";
import { logger, errorFields } from "@/lib/logger";
import { absoluteUrl } from "@/lib/site";

/**
 * Create a Stripe Checkout Session for a one-time credit pack and return its
 * hosted URL. The client redirects the browser to that URL. Credits are NOT
 * granted here — the webhook (api/webhooks/stripe) is the source of truth and
 * grants them after payment succeeds. We record a `pending` Payment row so the
 * success page and history have something to reconcile against.
 */
export async function createCheckoutSession(
  packId: string
): Promise<{ url: string }> {
  const user = await requireDbUser();

  const pack = getPack(packId);
  if (!pack) throw new AppError(ErrorCode.VALIDATION, "Unknown credit pack");
  if (!pack.priceId) {
    throw new AppError(ErrorCode.STRIPE_API_ERROR, "Credit pack is not configured");
  }

  const stripe = getStripe();

  // Reuse one Stripe customer per user so purchases group together in Stripe.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName ?? user.username,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const credits = totalCredits(pack);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: pack.priceId, quantity: 1 }],
      // Intentionally NO `payment_method_types`: Checkout then auto-presents the
      // methods enabled in the Stripe Dashboard (cards + Link today; Alipay +
      // WeChat Pay appear automatically once enabled — no code change needed).
      // Hardcoding a list fails if a method isn't an active account capability.
      // (`automatic_payment_methods` is a PaymentIntents param, not valid here.)
      // The webhook derives credits-to-grant from packId — metadata.credits is
      // only a convenience fallback.
      metadata: { userId: user.id, packId: pack.id, credits: String(credits) },
      success_url: absoluteUrl("/billing/success?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: absoluteUrl("/pricing"),
    });

    if (!session.url) {
      throw new AppError(ErrorCode.STRIPE_API_ERROR, "Stripe returned no checkout URL");
    }

    await prisma.payment.create({
      data: {
        userId: user.id,
        stripeSessionId: session.id,
        packId: pack.id,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        creditsGranted: credits,
        status: "pending",
      },
    });

    logger.info("checkout.session.created", {
      userId: user.id,
      packId: pack.id,
      sessionId: session.id,
    });

    return { url: session.url };
  } catch (err) {
    logger.error("checkout.session.failed", {
      userId: user.id,
      packId,
      ...errorFields(err),
    });
    if (err instanceof AppError) throw err;
    throw new AppError(ErrorCode.STRIPE_API_ERROR, "Failed to start checkout", err);
  }
}

export interface CheckoutStatus {
  status: "pending" | "paid" | "failed" | "unknown";
  creditsGranted: number;
  balance: number;
}

/**
 * Poll the status of a checkout by its Stripe session id. The success page
 * calls this until the webhook flips the Payment to `paid` (credits granted).
 * Scoped to the current user so one user can't read another's payment.
 */
export async function getCheckoutStatus(
  sessionId: string
): Promise<CheckoutStatus> {
  const user = await requireDbUser();

  const [payment, credits] = await Promise.all([
    prisma.payment.findFirst({
      where: { stripeSessionId: sessionId, userId: user.id },
      select: { status: true, creditsGranted: true },
    }),
    prisma.userCredits.findUnique({
      where: { userId: user.id },
      select: { balance: true },
    }),
  ]);

  return {
    status: (payment?.status as CheckoutStatus["status"]) ?? "unknown",
    creditsGranted: payment?.creditsGranted ?? 0,
    balance: credits?.balance ?? 0,
  };
}
