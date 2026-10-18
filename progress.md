# Progress

Status as of the end of the frontend/design session (2026-09-18). Next session picks up with backend + payments.

## Done — frontend & design

- [x] Full static site scaffold (no build tooling): `index.html`, `css/styles.css`, 8 JS files under `js/`. See CLAUDE.md for the file map.
- [x] Brand implementation: near-black/white/fire-red/deep-red palette, Anton + Barlow Condensed typography, grain overlay, brush-underline accent, custom SVG icon set (no emoji-as-icon).
- [x] Header, hero, leaderboard (Fan Power / Fan Army toggle), Fan Activity feed, footer — all sections from the original brief.
- [x] 20-actor roster in `js/actors.js`, with real nicknames the user specifically corrected (see decisions.md for the full before/after list). Current roster:
  Pawan Kalyan, Prabhas, Allu Arjun, Mahesh Babu, Jr NTR, Ram Charan, Chiranjeevi, Balakrishna, Nagarjuna, Venkatesh, Ravi Teja, Nani, Vijay Deverakonda, Naga Chaitanya, Nithiin, Sharwanand, Akhil Akkineni, Rana Daggubati, Ram Pothineni, Adivi Sesh.
  (Original build also had Sudheer Babu, Allu Sirish, Bellamkonda Sreenivas — removed and replaced with Rana Daggubati + Ram Pothineni per user request.)
- [x] Real logo integrated (crown + wordmark, user-supplied file, background made transparent, cropped into a crown-only and wordmark-only asset) — used correctly composed (crown above wordmark) in header/hero/footer/fan-card/downloadable-PNG.
- [x] Real hero background photo integrated: a user-supplied cinematic "fan rally" image, with its own baked-in fake logo/headline/CTA text patched out (inpainted with a matching gradient) and our real logo/headline/CTA overlaid instead; brightness lifted (gamma correction) since the first pass read too dark.
- [x] All 20 actor photos are real, user-supplied, licensed images — cropped to the leaderboard's portrait card ratio (4:5) with a face-favoring crop bias, two of them hand-fixed (Jr NTR had baked-in "JAI NTR" poster text cropped out; Vijay Deverakonda had a fan-edit watermark that the crop happened to exclude).
- [x] Support flow: amount selection (presets + custom) → name capture → celebration screen with fan-level badge, rank-movement copy, and a shareable Fan Card (WhatsApp/X/Instagram/copy-link + downloadable PNG via `<canvas>`, which draws the real logo images, not retyped text).
- [x] Fan-level system (`FAN_LEVELS`) wired everywhere a level badge appears (celebration screen, fan card, downloadable PNG).
- [x] Removed all "Demo / Prototype / V1 / No login·No OTP" language site-wide per user request — copy now reads as a finished product.
- [x] Reset all seed data to zero: every actor's `fan_power`/`fan_army` is `0`, and `SEED_ACTIVITY` is an empty array (with a proper "No fan activity yet" empty-state message instead of a blank section) — this is the intended pre-launch state, not a bug.
- [x] Fixed a real bug where `store.js` persisted the *entire* actor list to `localStorage` and blindly restored it on every visit, silently overriding every subsequent code change (new photos, renamed nicknames, roster changes) for a returning visitor. Rewritten to merge: fresh static fields + roster from code, only `fan_power`/`fan_army` carried over. Full story in decisions.md — worth knowing if "my last edit didn't show up" ever comes up again.
- [x] Local dev server (`scripts/serve.ps1`) sends explicit no-cache headers, and `index.html`'s local script/CSS tags carry a `?v=2` cache-busting query string, after a stale-cache bug caused a lot of back-and-forth debugging.

## Done — polish pass (2026-09-19)

- [x] Crown consistency: the #1 rank badge and the Legend level badge used a generic line-art crown; both now use the logo's real brush crown (`crown-mark.png` via `brandCrownHTML()`), and the off-brand `Icons.crown` was deleted.
- [x] Hero vertical gap: trimmed the transparent padding out of `fanwarsindia-logo.png` (new `scripts/trim-transparent.ps1`, 560×560 → 524×432) and made the hero top-aligned with less top padding (desktop was vertically centring inside a 740px box). Logo now sits right under the header; hero + leaderboard heading fit above the fold at 1440×900.
- [x] Support button / success screen naming: buttons read "Support Superstar Mahesh Babu", the success window reads "You just backed Superstar Mahesh Babu", and the name step reads "Backing Superstar Mahesh Babu with ₹…", all via one `actorTitle()` helper. Verified the longest names (Support Energetic Star Ram Pothineni / Mega Power Star Ram Charan / Rowdy Star Vijay Deverakonda) fit on one line at 375px.
- [x] Cache-bust version bumped `?v=2` → `?v=3` in `index.html`.

## Done — layout pass (2026-09-22)

- [x] Rank 4+ leaderboard rows now show the full "Support <Nickname> <Name>" button (same as top-3), not just an icon — verified all 20 actors render correct labels and the longest ones still fit on one line at 375px.
- [x] Fixed a stale-data report: a Chrome profile still had a pre-reset `localStorage` snapshot (large `fan_power`/`fan_army` numbers from before the zero-reset). This is expected behavior of the merge logic (by design it preserves prior contributions across code updates), not a bug — cleared that one profile's snapshot directly via Claude-in-Chrome. If it recurs elsewhere, the fix is the same: clear `localStorage` key `fanwarsindia_demo_state_v1` for that browser profile.
- [x] Two-column desktop layout: Telugu Fan Wars leaderboard (left, ~67% width) + Fan Activity (right, ~33% width, sticky) at `lg:` breakpoint (1024px+); collapses to the original single stacked column below that. See decisions.md for the exact classes/reasoning.
- [x] Top-3 leaderboard cards now carry a faint red-tinted gradient background (`rankBackgroundClasses()` in render.js), scaled by rank, on top of the existing glow border — makes them read as "elite" without a badge/medal. Rank 4+ unchanged.
- [x] Cache-bust version bumped `?v=3` → `?v=5` in `index.html` (two edits: rank 4+ button, then the tint).

## Explicitly declined / not done, on purpose

- **LAN/mobile access to the dev server** — investigated (Windows requires admin `netsh` to bind beyond `127.0.0.1`), gave the user the exact commands, but the user chose to skip it for now while on school wifi. Don't set this up without the user asking again, and if they do, use the *scoped* version (bind to the specific hotspot IP only, not `+`/wildcard) — see decisions.md.
- **AI-generated or web-scraped actor photos** — declined twice on copyright/publicity-rights grounds; only user-supplied licensed photos went in.
- **Pawan Kalyan's photo** — the user-supplied source image is an extreme close-up (just eyes/nose/mustache), unusable as a recognizable face no matter how it's cropped. Flagged to the user; they have not yet supplied a replacement. He's currently the #1-ranked (well, tied at ₹0 with everyone) actor, so this is the single highest-visibility image on the site. Worth re-raising if a photo refresh happens.

## Done — backend milestone 1: Supabase project + schema (2026-09-22)

- [x] Verified the frontend-only fan_power/fan_army math is correct before building on top of it: live-tested via `Store.addContribution()` (same name twice to one actor sums fan_power and counts as 1 fan_army; a different name counts as a 2nd; the same name to a *different* actor is correctly treated as a new supporter for that actor). See decisions.md if this needs re-checking later.
- [x] Backend platform decided: **Supabase** (solves the no-Node/no-Python local constraint — DB + Edge Functions provisioned entirely through tool calls). New project `fanwarsindia` (id `cntrkcpwetjjifubccha`, region `ap-south-1`), free tier, under the user's existing org. Kept separate from the user's two other unrelated Supabase projects.
- [x] Payment gateway decided: **the previous payment gateway** (user's choice, switched from the originally-recommended Razorpay). Steps for the user's side (signup, KYC docs, ToS/Refund/Privacy pages, test-mode keys, webhook URL) already given — see decisions.md / chat history for the full list. **Blocked on the user**: need a the previous payment gateway sandbox Client ID before the create-order Edge Function can be wired up for real (secret key never leaves the user / never enters chat — goes straight into a Supabase Edge Function secret).
- [x] Schema live: `actors` (seeded, matches `js/actors.js` exactly), `contributions` (empty, `status` pending/success/failed), `public_leaderboard()`/`public_activity()` SECURITY DEFINER functions for safe public reads. RLS on both tables; security advisor run clean (one intentional INFO, two intentional WARNs — see decisions.md for why each is expected, not a gap).
- [x] **fan_army's definition upgraded**: real contributions will count unique *phone number* per actor, not unique name-string (the frontend-only demo's limitation). See decisions.md.

## Done — live deployment (2026-09-22)

- [x] GitHub repo created: [github.com/sparlakota/fanwarsindia](https://github.com/sparlakota/fanwarsindia) (private — source has the actor photos and business logic; kept off public GitHub browsing even though the deployed site itself is public).
- [x] Deployed to Vercel: **https://fanwarsindia.vercel.app** — this is the live URL to use for the previous gateway's "website" field and any other place a public link is needed. Auto-deploys on every push to `master` from here on (Vercel's GitHub integration), zero-config static hosting (no build step, matches the no-build-tooling constraint).
- [x] Custom domain **fanwarsindia.com** (bought via Namecheap) connected to the Vercel project: `fanwarsindia.com` → 308 redirect → `www.fanwarsindia.com` (Production). Namecheap's default parking records (CNAME `www`→`parkingpage.namecheap.com`, URL Redirect `@`) were replaced with Vercel's records (A `@`→`216.198.79.1`, CNAME `www`→`44a5a0726e5b07cc.vercel-dns-017.com.`). DNS was propagating as of setup — if `fanwarsindia.com` doesn't resolve yet, give it a few minutes/hours and check `vercel.com/shab5/fanwarsindia/settings/domains` for "Valid Configuration."

## Done — fonts, share card, Top Fans (2026-09-24)

- [x] Typography: names/nicknames/labels now Oswald, body Barlow (regular width, was Barlow Condensed — too cramped at 10-11px), Anton kept for headlines/numerals/buttons.
- [x] Share artifact rebuilt: PNG now includes the star's photo (the old one was text-only Arial), fan name, unique card token (`FW-XXXXXX`), fanwarsindia.com. "Share Fan Card" opens the native share sheet with the image attached (Instagram/WhatsApp/X on phones); Instagram button saves the card + copies caption; WhatsApp/X buttons share the text + link.
- [x] Third leaderboard tab "Top Fans": individual supporters ranked by total contributed, showing the star they back most (+N more), fan level, and support count. Same top-3 tint treatment. Has an empty state.
- [x] Cache-bust `?v=7`. Payments remain deferred (the previous payment gateway KYC in progress).
- Not yet: no public per-card URL (`/card/FW-XXXXXX`) — needs the backend; link previews on WhatsApp/X show the site, not the individual card.

## Done — full-site bug sweep (2026-09-24)

- [x] **Security**: `decisions.md`, `progress.md`, `CLAUDE.md`, `scripts/`, `.claude/` were publicly readable on fanwarsindia.com (Vercel serves everything). Added `.vercelignore`. Added `vercel.json` security headers (nosniff, no framing, referrer policy, permissions policy).
- [x] Link previews: Open Graph + Twitter card tags and a 1200x630 `assets/og/og-image.jpg`, so shared links show an image instead of a bare URL.
- [x] Flag emoji rendered as "IN" on Windows → inline SVG flag.
- [x] "1 fans" → "1 fan".
- [x] Custom amount: 0.4 used to pass validation and show ₹0 (stored as ₹1); now whole rupees ₹1–₹1,00,000 with an inline hint. Enter submits.
- [x] Name field now actually gets focus (`autofocus` doesn't work on injected HTML). Back from the name step keeps the chosen amount and typed name.
- [x] Escape closes the support sheet; close buttons have `aria-label`.
- [x] Toasts were off-centre (pop-in's transform overrode the translate) → centred with auto margins. Copy toasts no longer claim success when the clipboard write fails.
- [x] Activity "x mins ago" refreshes every minute. `#leaderboard` no longer hides under the sticky header when jumped to.
- [x] Share card: long star titles shrink to fit two lines; more space above the amount.

## Done — payments build, waiting on the previous payment gateway keys (2026-09-24)

- [x] DB: `card_token`, `old-gateway-payment-id` columns; phone/name/amount check constraints; `public_top_fans()` (last-4 only); `public_activity()` now ordered by confirmation time.
- [x] Edge Functions deployed: `create-order`, `order-status`, `old-gateway` (source in `supabase/functions/`). Smoke-tested: preflight/CORS, "not configured" 503, unauthenticated calls rejected, status lookups, bad ids rejected, contributions table unreadable from the browser.
- [x] Frontend reads live data from Supabase (60s refresh + on tab focus); support flow now asks for name + mobile, runs the previous payment gateway checkout, polls for confirmation, and has failed/processing screens; redirect returns (`/?order_id=`) resume the flow.
- [x] Identity = mobile number, no OTP (user decision). Top Fans shows `Name ••1234`.
- [x] Tested success/failed screens end-to-end with temporary `fw_testdata_` rows (deleted afterwards; DB is empty). **Not yet tested against the previous payment gateway itself** — no keys yet.
- [x] **Not pushed/deployed to fanwarsindia.com yet** — deploying now would replace the demo support flow with "Payments open very soon". Deploy once sandbox payments are verified (or when the user decides).

### Sandbox test (2026-09-28) — passed
- the previous payment gateway test keys set as Supabase secrets (`old-gateway=sandbox`). the previous gateway's built-in "NOTIFY_URL" webhook entry (v2023-08-01, success events) delivers to the `notify_url` we send per order — no separate webhook endpoint needed.
- Real sandbox payment, ₹49 to Mahesh Babu, test Visa card + OTP 111000: webhook arrived twice from the previous payment gateway, signature verified both times (200), `syncOrder` marked it paid (old-gateway-payment-id stored), celebration screen + card token matched the DB, leaderboard / Fan Army / Top Fans (`Test Fan ••0001`) / Fan Activity all updated. Unpaid attempts stayed `pending` and were not counted.
- Not verified: the "closed the checkout" screen and an actual failed payment (the previous gateway's checkout doesn't close via Escape/backdrop; browser automation couldn't reach its close control). Card OTP opens as a pop-up window — fine for real users, blocked for automation.
- Test rows (phones 99999000xx) are still in the DB — delete before go-live.
- the previous payment gateway checkout shows "Business Name" — set the brand name/logo in the the previous payment gateway dashboard.
- **Do not deploy the new frontend while `old-gateway=sandbox`**: anyone could "pay" with public test cards and the fake payments would count on the live leaderboard.

### Full audit (2026-09-28)
Fixed: browser roles' table privileges revoked (defense in depth behind RLS); per-IP flood limit on create-order; return-URL origin check was a substring match (`evil-fanwarsindia.com` passed) → exact allowlist; emoji/Telugu names could fail the previous payment gateway order creation → ASCII-only copy sent; `escapeHTML` didn't escape quotes (attribute injection risk) → fixed and verified with a live XSS payload; leaderboard showed all-₹0 before data loaded / on outage → skeleton + retry; Top Fans' masked digits were truncated away on long names → own line; card token escaped. Probed from outside with the public key: no reads of phone numbers, no writes, forged webhooks rejected, malformed input rejected. DB wiped of all test rows afterwards.

Legal pages drafted (terms/privacy/refund/contact.html), linked from the footer and from a consent line under the Pay button; key positions: not affiliated with any actor, money goes to FanWarsIndia not the actor, not gambling, digital + non-refundable except failed/double/unauthorised charges (5–7 working days), only last 4 phone digits public, data stored in Mumbai, DPDP rights + Grievance Officer. **Published 2026-09-28** (commit 20735e1: the four pages, their CSS and footer links only, applied to the previously-live index.html; the payment code was deliberately left out and is still uncommitted locally). Placeholders filled 2026-09-28 (Shabareesh Parlakota, sole proprietor, Gurugram address, support@fanwarsindia.com, owner is Grievance Officer; no phone number by choice — phone box removed). Should get a lawyer/CA read before real scale.
Open (not code): the previous payment gateway checkout brand name ("Business Name"); no moderation for offensive fan names; closed-checkout and failed-payment screens still need one manual sandbox run; Tailwind runs from its CDN (fine now, slower than a build).

### 2026-09-28 (later)
- Moderation: `name_hidden` + owner-only `admin_hide_fan_name()`; public functions show "A fan" for hidden names.
- All payment work committed to branch `payments` and pushed → Vercel preview for phone testing; Edge Function CORS/return URL accept this team's preview origins. The preview is behind Vercel Authentication (strangers get a Vercel sign-in), so sandbox payments can't be made by the public there.
- Re-test on the preview (sandbox): ₹99 card payment for Jr NTR → webhook twice (200) → paid with old-gateway-payment-id → celebration screen ("climbed from #5 to #1") → leaderboard/Top Fans/activity updated. Hide switch verified: "A fan" publicly while hidden, money still counted, name restored on un-hide. **Failed-payment and closed-checkout screens still not exercised.**

- Safety net: `reconcile-pending` Edge Function + pg_cron every 10 min + 1 h order expiry. Tested by forcing the paid ₹99 test order back to pending → job recovered it (payment id restored). Also saw a the previous payment gateway sandbox 504 timeout on order creation — handled correctly (order marked failed, fan gets an error, retry worked).
- Speed (user reported slow test payments): measured — our functions cost ~0.3 s warm but 2–4 s on a cold start; the previous payment gateway **sandbox** order creation varied 1–11 s and returned 504 twice today (the main cause; production is expected to be faster). Fixes: the previous payment gateway SDK preloaded + both payment functions woken when the support sheet opens; CORS preflight cached 2 h (`Access-Control-Max-Age`); create-order's DB checks run in parallel; "taking longer than usual" message after 5 s; clear `gateway_error` message.
- New hero images (user-supplied, crowd-only, no actor likenesses): tall `hero-mobile.jpg` for phones, wide `hero-desktop.jpg` for laptops via `<picture>`; 2 MB PNGs compressed to 154/238 KB; old `hero-bg.jpg` (AI star lookalikes on banners) deleted; og-image rebuilt; hero scrim lightened for the darker new photos.
- **Everything except payments published to fanwarsindia.com**: `is_test` flag + `p_include_test` hides sandbox payments from the live site; create-order refuses sandbox payments from the live domain; live Support shows "opens very soon" (`paymentsOpenOnProduction` in config.js). `payments` branch merged into master.
- `GO-LIVE.md` checklist written (owner steps in the previous payment gateway + Supabase, Claude steps, first ₹1 payment, emergency pause, rollback).

### Next steps to go live with test payments
1. User: fix the the previous payment gateway test-mode "server error" (support chat), generate test App ID + Secret Key.
2. User: add Supabase secrets `old-gateway`, `old-gateway`, `old-gateway=sandbox` (Dashboard → Edge Functions → Secrets).
3. User: in the previous payment gateway (test mode) add webhook URL `https://cntrkcpwetjjifubccha.supabase.co/functions/v1/old-gateway`.
4. Claude: run a sandbox payment end-to-end on localhost (success, failure, closing the checkout), check the webhook fires and the signature verifies, then commit + push.
5. At go-live: live keys, `old-gateway=production`, whitelist `www.fanwarsindia.com` in the previous payment gateway, Terms/Refund/Privacy pages.

## Outstanding — rest of the payments build

1. **the previous payment gateway Edge Functions** (not started): a `create-order` function (calls the previous payment gateway Orders API, needs the user's sandbox keys) and a `old-gateway` function (HMAC-SHA256 signature verification per the previous gateway's docs, flips `contributions.status` to `success`, which is what actually credits fan_power/fan_army — never trust the browser redirect alone).
2. **Frontend rework**: `Store` needs to move from `localStorage`+`ACTORS` to calling Supabase (`public_leaderboard()`/`public_activity()` for reads, the new `create-order` function to start a contribution). `Store.addContribution()`-equivalent becomes async with real loading/failed states, which don't exist today because nothing can currently fail.
3. **the previous payment gateway Checkout on the frontend**: use the previous gateway's own hosted Checkout (JS SDK / redirect), never a custom card form.
4. **Terms/Refund/Privacy pages**: needed both for the previous gateway's own merchant approval and to actually publish before real payments go live. Not drafted yet.
5. **Anti-fraud**: phone-number uniqueness (above) is a real improvement over name-matching, but nothing stops one phone number backing many actors with tiny amounts, or other abuse patterns — revisit before going fully live.
6. **Testing**: full run-through in the previous gateway's sandbox/test mode before flipping to live keys.

## Known minor gaps (not blocking, worth a pass eventually)

- Leaderboard rows ranked 4+ still show an icon-only support button; the "Support <Nickname> <Name>" text is only in the tooltip/`aria-label` there. Say the word if the user wants a labelled button on every row (would need a layout change for those compact rows).
- The hero photo has a faintly visible darker rectangle where the fake baked-in logo was painted over (`scripts/patch-hero-bg.ps1`); the logo now overlaps most of it, but a cleaner source image would remove it entirely.

- No automated tests of any kind (matches the "no build tooling" constraint — would need at least a test runner, which doesn't exist here yet).
- Mobile/LAN testing of the dev server was never completed (see above).
- `scripts/*.ps1` / `scripts/*.sh` are one-off asset-generation tools, not part of the served app — fine to leave, but don't assume they run automatically or are part of any pipeline.

## 2026-09-29 — Audit fixes
- Unranked state: a star with nothing backed yet (0 in the active tab's metric) shows "—", no crown/glow, compact card. Ranks only appear once there is a score.
- Sub-label under the big number now names the active tab: Power tab "Fan Power · N fans", Army tab "Fan Army · ₹X fan power".
- Added branded `404.html` (Vercel serves it for unknown routes), `robots.txt`, `sitemap.xml`. Cache-bust bumped to `?v=17`.
- Audit "3 images missing alt" = the 3 intentional `alt=""` decorative images (header crown, hero backdrop, #1 crown). No `<img>` lacks the attribute.
- NOT done: replacing the Tailwind CDN with a compiled CSS build — needs a build tool (no Node on this machine) and the user's OK (see CLAUDE.md constraint 4).

## 2026-10-17 — the previous payment gateway declined; moved to Dodo Payments (test mode)
- the previous payment gateway did not approve the account. Dodo Payments approved (category "Others"; fan-support payments, instant digital delivery).
- Test product `pdt_0NpvOH0fLyksv8gDHl8nl` "Fan Wars_Test": one-time, pay-what-you-want, INR, minimum ₹49. Rename it before go-live.
- Built on branch `dodo` (not merged): new create-order / order-status / dodo-webhook / reconcile-pending, Dodo overlay checkout in support-flow.js, ₹49 minimum, policy pages name Dodo. Migration `add_dodo_columns_to_contributions`.
- Verified: webhook registered (4 payment events, signature enforced), create-order makes real Dodo test checkouts (₹49, INR, order ref in metadata), live origin refused, below-minimum refused, closing the checkout shows "Payment not completed". NOT yet verified: a completed test payment + webhook (the automated browser could not finish the card step) — owner to test on the preview link.
- Dodo checkout asks the fan for name, email and zip; 15-minute checkout timer.
- Mistakes fixed: placeholder common.ts briefly deployed to dodo-webhook (redeployed); a regex lost its escaping in support-flow.js (caught locally); raw images folder committed to `dodo` then removed in a follow-up commit (history still has it → squash-merge only).
- 2026-10-17 (later): the previous payment gateway removed from the project. DB: the order-reference column renamed `order_ref`, `old-gateway-payment-id` dropped (migration `remove_old_gateway_columns_use_order_ref`); all four functions redeployed on `order_ref`; `old-gateway` source deleted from the repo. Owner still to delete: the deployed `old-gateway` function and the `old-gateway*` secrets in the Supabase dashboard (the connector cannot delete functions/secrets). Older entries in this file mention the previous payment gateway only as history.

## 2026-10-18 — Live audit after go-live
- Live: Dodo live mode, Support open on fanwarsindia.com. First real payment (₹49, owner) credited by webhook 44 s after checkout start.
- Fixed: safety-net job looked up an old TEST-mode order in the LIVE Dodo account every 10 min (404 errors). `syncOrder()` now skips rows whose `is_test` doesn't match `DODO_ENV`, and `reconcile-pending` only selects rows of the current mode. Redeployed order-status, dodo-webhook, reconcile-pending (create-order doesn't call syncOrder, left as is). Stuck test order "Raj" marked failed.
- Fixed: celebration screen said "climbed from #4 to #1" for a star that had ₹0 (unranked). Now "Your star entered the board at #N".
- Fixed: Terms said contributions start at ₹1 (now ₹49, GST included) and now says Dodo Payments is merchant of record (statement name); Refund timeline 5–7 → 3–15 working days (Dodo's stated range).
- Checked OK: all pages/links/images, leaderboards (power/army/top fans), activity, amount/name/phone validation, XSS-safe names, fan card PNG 1080x1920, ?order_id return, hidden files 404, forged webhook 401, cron running.
- 2026-10-18: Support sheet — added ₹9,999 chip; custom amount hint now just "Minimum ₹49" (no maximum shown); silent ceiling raised 1,00,000 → 10,00,000 (DB check `contributions_amount_max`, create-order, support-flow.js); Terms say contributions start at ₹49. UPI itself caps a single payment (~₹1 lakh), so very large amounts must use cards.
- 2026-10-18 (later): No payment ceiling at all (owner decision). DB check `contributions_amount_max` dropped; create-order / support-flow only bound by the integer column capacity; hint shows "Minimum ₹49" only.
- 2026-10-18: Fan card redesigned (poster style: star photo with fade, rank badge with crown for #1, big amount, tier pill, "backed by", ticket stub with FAN CARD ID + issue date, story-safe margins). WhatsApp / X / Instagram buttons now open the phone's share sheet WITH the card PNG attached (Web Share API with files); on desktop they save the PNG and open the app page with the caption. Web pages cannot push an image into one specific app, so the fan taps the app (Instagram: Stories) in the share sheet.
- 2026-10-18 (latest): Fan card reverted to the ORIGINAL look (owner preferred it) with these changes: "I JUST BACKED" in white, star title (nickname + name) in red, FAN CARD ID directly under the fan's name, tight even spacing (no empty band above the footer). The PNG fits itself: a two-line star title makes the photo shorter so the footer stays inside the frame. Image sharing via the phone share sheet is unchanged.
- 2026-10-18 (final card): Fan card is EXACTLY the original layout/proportions (photo 496x620 etc.). Only changes: "I JUST BACKED" and a red-outlined FAN CARD ID box in the empty space above the footer (token no longer printed at the very bottom). Star title shrinks to stay on ONE line (all 20 stars fit; longest "Rowdy Star Vijay Deverakonda" renders at 74px), so nothing below ever moves.
- 2026-10-18: Owner's personal name removed from terms/privacy/contact. Now "FanWarsIndia (sole proprietorship)" + address + support@; grievance blocks say "Office: Grievance Officer, FanWarsIndia". Open flag told to owner: Indian rules (IT Rules 2021 / E-Commerce Rules 2020 / DPDP) expect a grievance officer's NAME to be published, and Dodo checks the site against the business details submitted — worth a CA/lawyer check.
