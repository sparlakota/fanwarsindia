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
- [x] Payment gateway decided: **Cashfree** (user's choice, switched from the originally-recommended Razorpay). Steps for the user's side (signup, KYC docs, ToS/Refund/Privacy pages, test-mode keys, webhook URL) already given — see decisions.md / chat history for the full list. **Blocked on the user**: need a Cashfree sandbox Client ID before the create-order Edge Function can be wired up for real (secret key never leaves the user / never enters chat — goes straight into a Supabase Edge Function secret).
- [x] Schema live: `actors` (seeded, matches `js/actors.js` exactly), `contributions` (empty, `status` pending/success/failed), `public_leaderboard()`/`public_activity()` SECURITY DEFINER functions for safe public reads. RLS on both tables; security advisor run clean (one intentional INFO, two intentional WARNs — see decisions.md for why each is expected, not a gap).
- [x] **fan_army's definition upgraded**: real contributions will count unique *phone number* per actor, not unique name-string (the frontend-only demo's limitation). See decisions.md.

## Outstanding — rest of the payments build

1. **Cashfree Edge Functions** (not started): a `create-order` function (calls Cashfree Orders API, needs the user's sandbox keys) and a `cashfree-webhook` function (HMAC-SHA256 signature verification per Cashfree's docs, flips `contributions.status` to `success`, which is what actually credits fan_power/fan_army — never trust the browser redirect alone).
2. **Frontend rework**: `Store` needs to move from `localStorage`+`ACTORS` to calling Supabase (`public_leaderboard()`/`public_activity()` for reads, the new `create-order` function to start a contribution). `Store.addContribution()`-equivalent becomes async with real loading/failed states, which don't exist today because nothing can currently fail.
3. **Cashfree Checkout on the frontend**: use Cashfree's own hosted Checkout (JS SDK / redirect), never a custom card form.
4. **Terms/Refund/Privacy pages**: needed both for Cashfree's own merchant approval and to actually publish before real payments go live. Not drafted yet.
5. **Anti-fraud**: phone-number uniqueness (above) is a real improvement over name-matching, but nothing stops one phone number backing many actors with tiny amounts, or other abuse patterns — revisit before going fully live.
6. **Testing**: full run-through in Cashfree's sandbox/test mode before flipping to live keys.

## Known minor gaps (not blocking, worth a pass eventually)

- Leaderboard rows ranked 4+ still show an icon-only support button; the "Support <Nickname> <Name>" text is only in the tooltip/`aria-label` there. Say the word if the user wants a labelled button on every row (would need a layout change for those compact rows).
- The hero photo has a faintly visible darker rectangle where the fake baked-in logo was painted over (`scripts/patch-hero-bg.ps1`); the logo now overlaps most of it, but a cleaner source image would remove it entirely.

- No automated tests of any kind (matches the "no build tooling" constraint — would need at least a test runner, which doesn't exist here yet).
- Mobile/LAN testing of the dev server was never completed (see above).
- `scripts/*.ps1` / `scripts/*.sh` are one-off asset-generation tools, not part of the served app — fine to leave, but don't assume they run automatically or are part of any pipeline.
