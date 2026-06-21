-- Add Stripe payment support (one-time credit packs).
--
-- Written idempotently (IF NOT EXISTS / guarded constraint) because this DB is
-- managed with `prisma db push` and already contains raw-SQL objects (pgvector
-- + pg_trgm indexes, LangGraph checkpoint tables) that are NOT in the Prisma
-- datamodel. A plain `db push`/`migrate dev` would try to drop those; this
-- migration is applied surgically via `prisma db execute` instead, so it must
-- be safe to re-run.

-- User.stripeCustomerId (lazily created on first checkout)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- Payment: one row per Stripe Checkout Session
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "packId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "creditsGranted" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");
CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "Payment_stripeSessionId_idx" ON "Payment"("stripeSessionId");

DO $$ BEGIN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- StripeEvent: webhook idempotency ledger
CREATE TABLE IF NOT EXISTS "StripeEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StripeEvent_eventId_key" ON "StripeEvent"("eventId");
CREATE INDEX IF NOT EXISTS "StripeEvent_eventId_idx" ON "StripeEvent"("eventId");
