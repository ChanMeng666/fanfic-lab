# Payments (Stripe) — Setup & Testing

FanFic Lab sells AI-generated stories via **credits** (1 credit ≈ 1000 words).
Money enters the system through **Stripe Checkout** (one-time credit packs,
supporting Alipay + WeChat Pay + card). This doc covers configuring Stripe,
local testing, and going live.

> Architecture: see [`AGENTS.md`](../AGENTS.md). The credit logic lives in
> `src/lib/actions/credits.ts`; the money-in path is `src/lib/actions/checkout.ts`
> (Checkout Session) → Stripe → `src/app/api/webhooks/stripe/route.ts` (grants
> credits). The **webhook is the source of truth** for granting credits.

---

## Billing model

| Action | Cost |
|--------|------|
| Short story (~1k words) | Free up to 3/day, then 1 credit |
| Medium story (~3k words) | 3 credits |
| Long story (~6k words) | 5 credits |
| Continuation (1 chapter) | word-based, 1 credit / 1000 words (min 1) |

The main generator charges the **quoted flat cost** for the selected length, so
the price shown before generating is exactly what's charged. Costs are defined in
`src/lib/billing/pricing.ts`. Credit packs are defined in
`src/lib/billing/packs-display.ts` (display) + `src/lib/billing/packs.ts` (price IDs).

---

## Stripe dashboard setup

1. **Create Products + Prices** (one Price per pack) in
   [dashboard.stripe.com](https://dashboard.stripe.com) → Products. Use a
   one-time price. Note each `price_…` id. Defaults (USD):
   - 入门包 Starter — 50 credits — $1.99
   - 标准包 Standard — 220 credits (200 + 20 bonus) — $5.99
   - 创作者包 Creator — 550 credits — $12.99

   The **credits granted are decided server-side from the pack id**
   (`packs-display.ts`), not from the Stripe price — so the Stripe amount and the
   `displayPrice` string just need to agree visually.

2. **Payment methods**: the Checkout Session intentionally sets **no**
   `payment_method_types` — Stripe Checkout then auto-presents whatever is enabled
   in the Dashboard (Settings → Payment methods). Cards + Link work out of the box;
   enable **Alipay** and **WeChat Pay** there to offer them (subject to account
   eligibility — e.g. a NZ-registered account may need to request access). They
   appear automatically once active, with no code change.
   (Note: `automatic_payment_methods` is a PaymentIntents-only param and is NOT
   valid on Checkout Sessions — omitting the list is the correct approach.)

3. **Add the webhook endpoint**: Developers → Webhooks → Add endpoint
   - URL: `https://fanfic-lab.tech/api/webhooks/stripe`
   - Events: `checkout.session.completed`
   - Copy the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.

---

## Environment variables

See [`.env.example`](../.env.example). All server-side (no `NEXT_PUBLIC_`):

```
STRIPE_SECRET_KEY=sk_test_… | sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_STARTER=price_…
STRIPE_PRICE_STANDARD=price_…
STRIPE_PRICE_CREATOR=price_…
```

- **Local**: put test-mode values in `.env.local`.
- **Prod**: add each as a **GitHub Actions secret** (Settings → Secrets →
  Actions). They flow through `.github/workflows/deploy.yml` into the container's
  `docker run -e`. After deploy, verify inside the container —
  `docker exec web-dreamwriter printenv | grep STRIPE` — because a GitHub secret
  can exist with an *empty* value.

If `STRIPE_SECRET_KEY` is unset the app still runs; checkout just fails with a
clear error.

---

## Local testing (Stripe CLI)

```bash
# 1. Run the app
npm run dev

# 2. Forward webhooks to the local route and copy the printed whsec_ into .env.local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 3. In the UI: /pricing → buy a pack → pay with test card 4242 4242 4242 4242
#    (any future expiry, any CVC). For Alipay/WeChat use the test redirect.
```

Verify:
- Credits land; the header `CreditBadge` and `/billing` balance update.
- A `Payment` row flips `pending → paid`; a `StripeEvent` row is written.
- **Idempotency**: `stripe events resend <evt_id>` (or trigger a duplicate) must
  NOT double-credit — the second delivery hits the `StripeEvent` unique lock.

Generation billing:
- Pick 中篇 with balance ≥ 3 → after delivery, balance −3, toast shown,
  `Generation.creditsCharged = 3`.
- Free 短篇 within the daily limit charges 0.
- Drain credits → starting another paid piece shows the **OutOfCreditsDialog**.

---

## Going live

1. Switch to **live** keys + create live-mode Prices + a live webhook endpoint.
2. Update the GitHub secrets with live values; push to `master` to redeploy.
3. Make one small real purchase; confirm a `200` for the webhook in the Stripe
   dashboard and that credits were granted.
