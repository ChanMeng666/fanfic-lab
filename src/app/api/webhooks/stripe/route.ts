import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getPack, totalCredits } from "@/lib/billing/packs";
import { logger, errorFields } from "@/lib/logger";

// Stripe signature verification needs the raw request body + Node crypto, so
// pin the Node runtime. App Router route handlers don't pre-parse the body, so
// req.text() yields the exact bytes Stripe signed.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    logger.error("stripe.webhook.misconfigured", {
      hasSignature: Boolean(sig),
      hasSecret: Boolean(secret),
    });
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    logger.error("stripe.webhook.verification.failed", errorFields(err));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency lock: the unique insert on eventId wins exactly once, even if
  // Stripe delivers the same event multiple times (or concurrently). A duplicate
  // insert means we've already handled it.
  try {
    await prisma.stripeEvent.create({
      data: { eventId: event.id, type: event.type },
    });
  } catch {
    logger.info("stripe.webhook.duplicate", { eventId: event.id, type: event.type });
    return NextResponse.json({ received: true, duplicate: true });
  }

  logger.info("stripe.webhook.received", { eventId: event.id, type: event.type });

  try {
    if (event.type === "checkout.session.completed") {
      await fulfillCheckout(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    // Nothing was committed (fulfillment runs in a transaction), so release the
    // idempotency lock and return 500 — Stripe will retry the delivery.
    logger.error("stripe.webhook.handler.failed", {
      eventId: event.id,
      type: event.type,
      ...errorFields(err),
    });
    await prisma.stripeEvent.delete({ where: { eventId: event.id } }).catch(() => {});
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Grant the purchased credits and mark the Payment paid. Runs in a single
 * transaction so the credit increment and the Payment update commit together
 * (or not at all) — making retries safe. The intra-transaction status check
 * guards against the rare case of re-fulfilling an already-paid session.
 */
async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== "paid") {
    logger.info("stripe.checkout.not_paid", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });
    return;
  }

  const userId = session.metadata?.userId;
  const packId = session.metadata?.packId;
  if (!userId || !packId) {
    throw new Error(`checkout.session.completed missing metadata (session ${session.id})`);
  }

  const pack = getPack(packId);
  const credits = pack
    ? totalCredits(pack)
    : Number(session.metadata?.credits ?? 0);
  if (!credits || credits <= 0) {
    throw new Error(`Resolved 0 credits to grant for pack ${packId}`);
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({
      where: { stripeSessionId: session.id },
      select: { status: true },
    });
    if (existing?.status === "paid") {
      logger.info("stripe.checkout.already_fulfilled", { sessionId: session.id });
      return;
    }

    await tx.userCredits.upsert({
      where: { userId },
      create: { userId, balance: credits, totalUsed: 0 },
      update: { balance: { increment: credits } },
    });

    await tx.payment.upsert({
      where: { stripeSessionId: session.id },
      create: {
        userId,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        packId,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        creditsGranted: credits,
        status: "paid",
        completedAt: new Date(),
      },
      update: {
        status: "paid",
        completedAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
        amount: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
      },
    });
  });

  logger.info("stripe.checkout.fulfilled", {
    sessionId: session.id,
    userId,
    packId,
    credits,
  });
}
