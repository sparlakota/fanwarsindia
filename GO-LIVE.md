# FanWarsIndia — Go-live checklist

Use this the day Cashfree activates the account. Total time: ~15 minutes.
Owner = you (Shabareesh). Claude = the AI assistant session. Tick each box in order.

---

## A. Before switching (owner, in the Cashfree dashboard — switch it to **Live / Production** mode)

- [ ] **Account activated** — the "Product Activation Pending" banner is gone and Payment Gateway shows Active.
- [ ] **Brand name and logo** set (Settings → Brand / Checkout customization), so checkout says *FanWarsIndia*, not "Business Name". Use `assets/logo/fanwarsindia-logo.png`.
- [ ] **Whitelist the website domains** (Developers → Whitelisting / Domains): `https://www.fanwarsindia.com` and `https://fanwarsindia.com`. Live checkout refuses to open on un-whitelisted sites.
- [ ] **Webhook**: Developers → Webhooks → Payment Gateway, in **Live** mode. Confirm the `NOTIFY_URL` row exists with **success payment** ticked (same as test mode). Do **not** add a second endpoint with our URL — it would double every notification.
- [ ] **Generate live API keys** (Developers → API Keys, Live mode): an **App ID** and a **Secret Key**. Don't paste the secret into chat, email or any file.

## B. Switch the server to live money (owner, in Supabase)

Supabase → project **fanwarsindia** → Edge Functions → Secrets. Replace the values (same names):

| Name | New value |
|---|---|
| `CASHFREE_APP_ID` | live App ID |
| `CASHFREE_SECRET_KEY` | live Secret Key |
| `CASHFREE_ENV` | `production` |

Save. From this moment the preview link also takes **real money** (it shares the same server) — it's behind your Vercel login, so only you can use it.

## C. Open payments on the live site (Claude does this — just say "go live")

The full site is already live; only payments are switched off. Test-card payments are tagged `is_test` and never shown on fanwarsindia.com, and the server refuses test-mode payments from the live domain.

1. In `js/config.js` set `paymentsOpenOnProduction = true`, bump the `?v=` cache version, commit and push `master` → Vercel deploys. (The server side opens by itself once `CASHFREE_ENV=production`.)
2. Tidy the database (optional — test rows are already invisible on the live site):
   ```sql
   select count(*), sum(amount) from contributions where is_test;   -- look first
   delete from contributions where is_test;
   ```
3. Check: Support on fanwarsindia.com opens the real checkout (not "opens very soon"), and `/progress.md` is still 404.

## D. First real payment (owner, ~3 minutes)

- [ ] On your phone, open **fanwarsindia.com**, support any star with **₹1** via UPI, using your own name and number.
- [ ] You should see the celebration screen; the star shows ₹1 / 1 fan; Fan Activity shows you.
- [ ] Claude confirms: Cashfree webhook arrived (signature OK), payment marked paid with a payment ID.
- [ ] Try **Share Fan Card** on the phone.
- [ ] Optional: remove your ₹1 from the board afterwards — ask Claude to delete that row (and refund it from the Cashfree dashboard if you like).

## E. After launch — know these

- **Pause payments in an emergency** (site stays up, leaderboard still shows): in Supabase secrets, delete `CASHFREE_SECRET_KEY`. Fans then see "Payments open very soon". Put it back to resume.
- **Hide an abusive name**: Supabase → SQL editor → `select admin_hide_fan_name('FW-XXXXXX');` (add `, true` to hide every contribution from that fan; `, false, false` to un-hide).
- **Stuck payments** are rechecked automatically every 10 minutes (`reconcile-pending` job) — a fan who paid is never left uncounted. Unpaid checkouts expire after 1 hour.
- **Refund requests** go to `support@fanwarsindia.com` (forwards to your Gmail). Refunds are issued from the Cashfree dashboard; after refunding, ask Claude to delete or mark that contribution so the leaderboard matches.
- **Close payments again without taking the site down**: set `paymentsOpenOnProduction = false` in `js/config.js` and push (or use the emergency pause above).
- **Roll back completely**: Claude reverts `master` to the previous commit; the previous site comes back within a minute.
