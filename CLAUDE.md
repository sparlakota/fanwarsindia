# FanWarsIndia — Claude Code Orientation

Read this first. For the "why" behind non-obvious choices, see [decisions.md](decisions.md). For what's done vs. outstanding, see [progress.md](progress.md).

## What this is

A Telugu-cinema fandom leaderboard site. Fans "support" their favorite actor with a rupee amount; it moves two leaderboards (Fan Power = cumulative ₹, Fan Army = unique supporter count). Brand: "pure cult, pure mass, pure fan" — raw, cinematic, tribal, explicitly **not** SaaS/corporate/casino/AI-generic. Colors: near-black `#050505`, white, fire red `#FF1A1A`, deep red `#B00000`.

Static frontend (Vercel) + **Supabase backend** (Postgres + 4 Edge Functions) + **Cashfree** payments. As of 2026-09-28 the **whole site is live on fanwarsindia.com except payments**: Cashfree runs in sandbox (test) mode, and the live domain shows "Support opens very soon" instead of checkout. Payments open on launch day by following `GO-LIVE.md` (live keys + `CASHFREE_ENV=production` + flip `paymentsOpenOnProduction` in `js/config.js`).

**Test vs live data**: every contribution created while `CASHFREE_ENV=sandbox` has `is_test = true`. The `public_*` functions take `p_include_test` (default false); the live domain never shows test rows (`FW_CONFIG.showTestData` is false there), while preview links and localhost show them for testing. `create-order` refuses sandbox payments whose Origin is the live domain.

## Stack — deliberately no build tooling

Plain HTML/CSS/vanilla JS, loaded via classic (non-module) `<script>` tags so it runs straight off the filesystem or any static server — no npm, no bundler, no framework. **This was forced, not chosen**: the dev machine has no Node, no Python, no ImageMagick. See decisions.md for what that ruled in/out. Do not introduce a build step, a framework, or npm dependencies without checking with the user first — the whole architecture assumes zero install step.

Tailwind is loaded via the CDN script (`cdn.tailwindcss.com`) with an inline config in `index.html` for the brand colors/fonts. Custom CSS (grain, glow, animations, brand-specific classes) lives in `css/styles.css` on top of it.

## Running it locally

There's no `npm start`. Use the PowerShell static file server:

```
powershell -File scripts/serve.ps1
```

Serves the project root on `http://localhost:8791` (or via the `fanwarsindia-static` launch config in `.claude/launch.json`, which the Browser pane's `preview_start` tool picks up automatically). The server sets `Cache-Control: no-cache, no-store, must-revalidate` on every response — do not remove this, it caused a real multi-turn debugging session before (see decisions.md). All local script/CSS references in `index.html` also carry a `?v=16` cache-busting query string; **bump that version number** if you ever edit a JS/CSS file and need to guarantee a stale-cache-proof reload for the user.

The server binds to `127.0.0.1` only. It is **not** reachable from other devices (phone, etc.) — that was evaluated and intentionally not set up because the laptop is sometimes on school wifi and opening the port safely would need admin-elevated `netsh` commands the user chose to skip for now. See decisions.md if this comes up again.

Opening `index.html` directly via `file://` also works in a real browser (plain relative paths, no ES modules), but **not** in Claude's own sandboxed Browser-pane preview — that renders local `file://` pages as an isolated snapshot that can't fetch sibling files. Always use the `preview_start`/`localhost:8791` route to test visually inside a Claude session.

## File structure

```
index.html              All markup (header, hero, leaderboard, activity feed, footer, modal mount point)
terms.html / privacy.html / refund.html / contact.html
                        Legal pages (drafted 2026-09-28, not lawyer-reviewed). Details only the owner knows are
                        <span class="fill-me">[…]</span> — bright yellow. NEVER deploy with any left:
                        `grep -c fill-me *.html` must be 0 for the four pages before a push.
css/styles.css           Custom CSS on top of Tailwind CDN utilities
js/
  config.js               FW_CONFIG — Supabase URL + public anon key (safe to ship; see Backend section)
  actors.js               ACTORS array — roster display data (name, nickname, photo); numbers come from the server
  fanLevel.js              FAN_LEVELS tiers + getFanLevel()/getNextFanLevel()
  icons.js                 Icons.* — inline SVG UI icon set (no emoji, and NO crown — see below)
  store.js                 Store — loads leaderboard/activity/top fans from Supabase; createOrder/getOrderStatus
  render.js                Leaderboard/activity DOM rendering, rank/level badge helpers
  fan-card.js               FanCard.html()/toBlob()/shareBlob()/saveBlob() — the shareable card (on-screen + 1080x1920 PNG)
  support-flow.js           SupportFlow — amount → name+mobile → Cashfree checkout → verify → celebration
  main.js                   Bootstraps rendering, loads data, refreshes every 60s, resumes ?order_id= returns
supabase/functions/       Edge Function source (deployed via the Supabase connector, not auto-deployed from git)
  _shared/common.ts         CORS, Cashfree config/headers, syncOrder() — the only code that marks a payment successful
  create-order/             POST: validate, insert pending contribution, create Cashfree order
  order-status/             GET: syncs with Cashfree if pending, returns celebration data
  cashfree-webhook/         POST from Cashfree: verifies signature, then syncOrder()
  reconcile-pending/        POST from pg_cron every 10 min: re-checks stuck pending orders with Cashfree
GO-LIVE.md                Step-by-step checklist for the day live Cashfree keys arrive
assets/
  actors/*.jpg              Real licensed actor photos (20), filenames = actor slug
  logo/                    crown-mark.png, wordmark-mark.png, fanwarsindia-logo.png — the REAL brand logo (see decisions.md)
  hero/hero-mobile.jpg       Hero for phones (941x1672, served via <picture> below 768px)
  hero/hero-desktop.jpg      Hero for tablets/laptops (1672x941). Both user-supplied (2026-09-28), crowd-only —
                             no actor likenesses (the old hero-bg.jpg had AI lookalikes on banners; deleted).
                             Rebuild from a PNG with scripts/to-jpeg.ps1; rebuild og-image with make-og-image.ps1 -Hero assets/hero/hero-desktop.jpg
  og/og-image.jpg            1200x630 link-preview image (built by scripts/make-og-image.ps1)
scripts/                  One-off PowerShell/bash tools used to build the above assets (kept for reproducibility, not run automatically)
.claude/launch.json       Browser-pane preview config (runs scripts/serve.ps1)
vercel.json               Security headers for the live site
.vercelignore             Keeps .claude/, scripts/, supabase/ and all *.md (these notes!) OFF the public site — they were publicly readable before it existed
```

## Email

`support@fanwarsindia.com` is a Namecheap free **forwarder** to the owner's personal Gmail (set up 2026-09-28; MX = eforward1–5.registrar-servers.com + SPF). Receive-only: replies from Gmail reveal the personal address unless "send as" or Zoho Mail is set up later. The personal Gmail must never appear on the site — use `support@` everywhere public.

## Deployment

Live at **https://www.fanwarsindia.com** (apex redirects to www). Vercel project `shab5/fanwarsindia`, auto-deploys every push to `master` of the private GitHub repo `sparlakota/fanwarsindia`. Anything not listed in `.vercelignore` is public — keep internal notes, keys and scripts out of the served tree.

## Backend & payments

Supabase project `fanwarsindia` (id `cntrkcpwetjjifubccha`, ap-south-1), managed through the Supabase connector (migrations, Edge Function deploys, SQL). Cashfree is the payment gateway.

**Tables** (RLS on both):
- `actors` — roster, public read. Must stay in sync with `js/actors.js` ids (the frontend takes display data from `ACTORS`, numbers from the server).
- `contributions` — `actor_id, supporter_name, supporter_phone (10-digit, ^[6-9]), amount (₹1–1,00,000), cashfree_order_id (fw_…), card_token (FW-XXXXXX), status pending|success|failed, cf_payment_id, client_ip_hash (salted SHA-256, rate limiting only), created_at, confirmed_at`. **No RLS policies and no table privileges** for `anon`/`authenticated` (revoked 2026-09-28; browser writes to `actors` revoked too — SELECT only). Only Edge Functions (service role) touch it.

**Moderation (hide an abusive name)**: `contributions.name_hidden`. Hidden names show publicly as "A fan" in Fan Activity and Top Fans; the money still counts. The owner hides a name either by ticking `name_hidden` in Supabase → Table Editor → contributions, or in the SQL editor: `select admin_hide_fan_name('FW-XXXXXX');` (one contribution) / `select admin_hide_fan_name('FW-XXXXXX', true);` (every contribution from that fan's phone) / add `, false` as a third argument to un-hide. `admin_hide_fan_name` is revoked from anon/authenticated — owner-only.

**Branches / previews**: `master` = fanwarsindia.com. The `payments` branch was merged into master on 2026-09-28; keep using a non-master branch for risky work — Vercel builds each as a preview (`fanwarsindia-git-<branch>-shab5.vercel.app`, behind Vercel login) on the same Supabase backend. Edge Function CORS accepts `https://fanwarsindia(-…)?-shab5.vercel.app` (this Vercel team only).

**Safety net (`reconcile-pending`)**: pg_cron job `reconcile-pending-payments` runs every 10 min and POSTs (via pg_net) to the `reconcile-pending` Edge Function with header `x-reconcile-token` = Vault secret `reconcile_token`; the function checks it with `reconcile_token_ok()` (service_role only) and runs `syncOrder()` on pending orders 2 min–48 h old. Orders are created with a 1 h `order_expiry_time`, so abandoned checkouts become EXPIRED → `failed`. Verified 2026-09-28 by forcing a paid order back to pending: the job recovered it. **Go-live steps: see `GO-LIVE.md`.**

**Abuse limits in `create-order`**: max 5 pending orders per phone and 30 unpaid orders per hashed IP, per 10 minutes (IP limit is generous on purpose — Indian carriers share IPs via CGNAT). Cashfree gets a plain-ASCII copy of the fan's name (or none) because emoji/other scripts can fail order creation; the real name is stored for display.

**Public read functions** (SECURITY DEFINER, pinned search_path; the advisor WARNs about anon access are intentional): `public_leaderboard()` (fan_power = sum of success, fan_army = distinct phones), `public_activity()` (last 50 successes, ordered by confirmation time), `public_top_fans(p_limit)` (one row per phone; returns only `phone_last4`, never the number or a hash of it).

**Identity**: a fan = a mobile number (user's decision, 2026-09-24: no OTP, to keep checkout frictionless). Names are display-only; Top Fans shows `Name ••1234`.

**Payment flow**: `create-order` (pending row + Cashfree order) → Cashfree JS SDK v3 checkout in a modal → `order-status` polled every 2s → success screen. `syncOrder()` in `_shared/common.ts` is the **only** place a row becomes `success`: it asks Cashfree's Get Order API server-to-server and checks `order_status === "PAID"` and the amount. The webhook only triggers `syncOrder()`; the browser can never credit anything. Redirect-based bank/UPI flows return to `/?order_id=fw_…`, which `main.js` resumes.

**Secrets** (Supabase → Edge Functions → Secrets): `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` (`sandbox` | `production`), optional `CASHFREE_API_VERSION` (default `2023-08-01`). `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

**Deploying function changes**: edit `supabase/functions/…`, then redeploy that function with the Supabase connector's `deploy_edge_function`, passing `index.ts` plus `../_shared/common.ts`. `create-order`/`order-status` use `verify_jwt: true` (the site sends the anon JWT); `cashfree-webhook` uses `verify_jwt: false` (Cashfree can't send a JWT; the HMAC signature is its auth). Git pushes do **not** deploy functions.

**Testing without real payments**: insert rows with `cashfree_order_id like 'fw_testdata_%'` via SQL, open `/?order_id=fw_testdata_…` to see the success/failed screens, then delete them. The database was left empty on 2026-09-24.

The old browser-only store (localStorage key `fanwarsindia_demo_state_v1`) is gone; `store.js` deletes that key on load so stale demo numbers can't reappear.

## Design system quick reference

- **Fonts** (Google Fonts): `Anton` for hero/headlines/rank numerals/metrics/buttons (`.font-display`); `Oswald` for actor names, nicknames, fan names and small caps labels (`.font-name`, sharper than Anton at small sizes); `Barlow` (regular width) for body text (`.font-body`, the page default). The share-card canvas in `js/fan-card.js` uses the same three fonts and must `document.fonts.load()` them before drawing.
- **Leaderboard modes**: `Store.state.leaderboardMode` is `power` | `army` | `fans`. `fans` = "Top Fans" (one entry per mobile number, ranked by total contributed, via `Store.getTopFans()`, rendered by `topFanCardHTML()` with the masked `••1234`).
- **Share card**: each contribution gets a server-generated `card_token` (`FW-XXXXXX`, made in `create-order`), printed on the card. `FanCard.toBlob()` renders the 1080x1920 PNG (real actor photo, fan name, token, fanwarsindia.com); `FanCard.shareBlob()` uses the Web Share API with the image attached (falls back to saving the file). The blob is pre-rendered when the success sheet opens so the share sheet can open inside the tap.
- **Untrusted text**: fan names come from strangers. Always pass them through `escapeHTML()` (render.js) — it escapes `& < > " '`, so it's safe inside attributes too. Every `innerHTML` template was audited 2026-09-28 and an injected `"><img onerror=…>` name rendered as plain text everywhere.
- **Loading states**: until `Store.load()` succeeds once, the leaderboard shows skeleton cards (or a "Couldn't load… Try again" card) instead of all-₹0 stars — an all-zero board reads as "the site was wiped".
- **Brand colors** (Tailwind config in `index.html`): `fwblack #050505`, `fwwhite #FFFFFF`, `fwred #FF1A1A`, `fwdeepred #B00000`.
- **No emoji as UI icons.** Use `Icons.*` from `js/icons.js` (flame, crowd, star, share, close, back, whatsapp, x, instagram, link, download). The India flag next to "Telugu Fan Wars" is an inline SVG, not the 🇮🇳 emoji — Windows has no flag emoji and showed the letters "IN". Don't switch it back.
- **The crown is always the logo's crown.** Any crown anywhere in the UI (rank #1 badge, Legend badge, header, fan card) must be `assets/logo/crown-mark.png` — use `brandCrownHTML(heightPx)` in `render.js`. There used to be a generic line-art `Icons.crown`; it was deleted because it looked off-brand next to the logo's brush-painted crown. Do not add a crown back to `icons.js`.
- **Rank display**: top-3 leaderboard cards use `rank-glow-{1,2,3}` CSS classes + a numeral (`01`/`02`/`03`) + the brand crown for #1. Never use medal emoji (🥇🥈🥉) — that was explicitly replaced for looking "gamified app" rather than "movie fandom."
- **Fan levels**: `FAN_LEVELS` in `js/fanLevel.js` — Supporter (₹1–99) → Fan (₹100–499) → Superfan (₹500–1999) → Die-hard (₹2000–9999) → Legend (₹10000+). Each has a `color`; render via a small colored dot (or the brand crown for Legend) — see `levelBadgeHTML()` in `render.js`. No emoji circles.
- **Star naming format**: Support buttons and the "You just backed…" screen (and the "Backing … with" line) all use `actorTitle(actor)` from `render.js` → "Superstar Mahesh Babu" (nickname + name). If the nickname is just the actor's own first name (Akhil, Rana, Sharwa) it returns the name alone, to avoid "Akhil Akhil Akkineni". Use this helper for any new place that names a star; don't hand-build the string. Every row, including rank 4+, shows the full "Support …" label.
- **Logo usage**: `crown-mark.png` + `wordmark-mark.png` are cropped from the user's real logo file and are meant to be composed **crown-above-wordmark** (vertically stacked), never side-by-side — that was a real bug fixed mid-project. `fanwarsindia-logo.png` is the full pre-composed lockup (crown + wordmark + tagline in one image) used in the hero and footer where a large, exact reproduction is wanted. It is **trimmed to its visible content** (`scripts/trim-transparent.ps1`) — the original export had ~11% transparent padding above the crown, which was a big part of a "too much empty space above the logo" complaint. If the logo is ever re-exported, re-run the trim after `make-transparent.ps1`. The hero is top-aligned with minimal top padding for the same reason; don't re-centre it vertically.
- **Actor cards**: portrait aspect ~4:5, `object-cover`. Real photos live in `assets/actors/*.jpg`.
- Copy tone: no "Demo", "Prototype", "V1", "No login/No OTP" language anywhere in user-facing text — the site should read as a finished product even though it's functionally a prototype. Do not reintroduce that language without the user asking.

## Hard constraints — do not violate without asking the user first

1. **No real actor photos may be sourced by Claude from the web.** Copyright + Indian personality/publicity-rights exposure (live litigation precedent: Anil Kapoor, Amitabh Bachchan, Jackie Shroff). The current 20 photos were supplied by the user directly (see decisions.md) — only add/replace actor images when the user hands you a local file path.
2. **No AI-generated actor images either** — user explicitly declined this route too.
3. Don't expose the local dev server beyond `127.0.0.1` without re-confirming the network safety context with the user (see decisions.md — school wifi consideration).
4. Don't add a build step / npm / framework without checking first (see Stack section above).
5. Never put the Cashfree secret key (or the Supabase service-role key) in the repo, in `js/`, or in chat. Secrets live only in Supabase's Edge Function secrets. Never make `contributions` readable to the browser — it holds phone numbers.
6. Don't switch Cashfree to `production` (live money) without the user explicitly saying so.
