# FanWarsIndia — Go-live checklist (Dodo Payments)

Use this when you are ready to take real money. Owner = you (Shabareesh). Claude = the AI assistant session.

Payments run on **Dodo Payments** (merchant of record). Today everything is in **test mode**: the `dodo` branch /
preview link takes test payments; fanwarsindia.com shows "Support opens very soon".

---

## A. In the Dodo dashboard — switch to **Live mode**

- [ ] **Account approved for live payments** (Dodo's go-live / business verification complete).
- [ ] **Create the live product**: one-time, **Pay what you want**, currency **INR**, name e.g. "FanWarsIndia Fan Support",
      minimum price **₹49** (must match `MIN_AMOUNT` in `create-order` and `js/support-flow.js`). Copy its `pdt_…` ID.
      (The test product "Fan Wars_Test" is test-mode only and is not copied automatically.)
- [ ] **Live API key**: Developer → API Keys (Live mode). Don't paste it in chat or any file.
- [ ] **Live webhook**: Developer → Webhooks (Live mode) → add endpoint
      `https://cntrkcpwetjjifubccha.supabase.co/functions/v1/dodo-webhook`, tick all four `payment.*` events.
      Copy its `whsec_…` signing secret.
- [ ] Check the checkout shows the brand name / logo you want (Dodo dashboard branding settings).

## B. Supabase → Edge Functions → Secrets (owner)

| Name | New value |
|---|---|
| `DODO_API_KEY` | live API key |
| `DODO_PRODUCT_ID` | live product ID |
| `DODO_WEBHOOK_KEY` | live webhook signing secret |
| `DODO_ENV` | `live_mode` |

From this moment the preview link also takes **real money** (same server). It is behind your Vercel login.

## C. Open payments on the live site (Claude — just say "go live")

1. Squash-merge the `dodo` branch into `master` (never a normal merge — the branch history contains a raw image folder).
2. In `js/config.js` set `paymentsOpenOnProduction = true`, bump `?v=`, commit, push `master`.
3. Optional: `delete from contributions where is_test;` (test rows are already invisible on the live site).
4. Check: Support on fanwarsindia.com opens Dodo checkout; `/progress.md` still 404.

## D. First real payment (owner)

- [ ] On your phone, support any star for **₹49** (the minimum) via UPI with your own name/number.
- [ ] Celebration screen shows; star shows ₹49 / 1 fan; Fan Activity shows you.
- [ ] Claude confirms: webhook arrived, row is `success` with a `dodo_payment_id`.
- [ ] Try **Share Fan Card**. Optionally refund the ₹49 from the Dodo dashboard and ask Claude to delete the row.

## E. Know these

- **Pause payments in an emergency**: delete the `DODO_API_KEY` secret in Supabase. Fans see "Support opens very soon".
- **Hide an abusive name**: `select admin_hide_fan_name('FW-XXXXXX');` (add `, true` for every contribution from that fan).
- **Stuck payments** are re-checked every 10 minutes by `reconcile-pending`. A Dodo checkout link lives ~24 h; a row with no
  payment attempt after that becomes `failed`, and `failed` rows are re-checked for a few hours in case the fan paid late.
- **Refunds**: issued from the Dodo dashboard; then ask Claude to remove that contribution so the leaderboard matches.
- **Close payments without taking the site down**: `paymentsOpenOnProduction = false` in `js/config.js` and push.
- **Roll back**: Claude reverts `master`; the old site returns within a minute.
