# FanWarsIndia — Claude Code Orientation

Read this first. For the "why" behind non-obvious choices, see [decisions.md](decisions.md). For what's done vs. outstanding, see [progress.md](progress.md).

## What this is

A Telugu-cinema fandom leaderboard site. Fans "support" their favorite actor with a rupee amount; it moves two leaderboards (Fan Power = cumulative ₹, Fan Army = unique supporter count). Brand: "pure cult, pure mass, pure fan" — raw, cinematic, tribal, explicitly **not** SaaS/corporate/casino/AI-generic. Colors: near-black `#050505`, white, fire red `#FF1A1A`, deep red `#B00000`.

This is currently a **frontend-only prototype**. No backend, no database, no real payments. Everything lives in static files and the browser's `localStorage`. Payments/backend are planned for a future session — see the roadmap in progress.md.

## Stack — deliberately no build tooling

Plain HTML/CSS/vanilla JS, loaded via classic (non-module) `<script>` tags so it runs straight off the filesystem or any static server — no npm, no bundler, no framework. **This was forced, not chosen**: the dev machine has no Node, no Python, no ImageMagick. See decisions.md for what that ruled in/out. Do not introduce a build step, a framework, or npm dependencies without checking with the user first — the whole architecture assumes zero install step.

Tailwind is loaded via the CDN script (`cdn.tailwindcss.com`) with an inline config in `index.html` for the brand colors/fonts. Custom CSS (grain, glow, animations, brand-specific classes) lives in `css/styles.css` on top of it.

## Running it locally

There's no `npm start`. Use the PowerShell static file server:

```
powershell -File scripts/serve.ps1
```

Serves the project root on `http://localhost:8791` (or via the `fanwarsindia-static` launch config in `.claude/launch.json`, which the Browser pane's `preview_start` tool picks up automatically). The server sets `Cache-Control: no-cache, no-store, must-revalidate` on every response — do not remove this, it caused a real multi-turn debugging session before (see decisions.md). All local script/CSS references in `index.html` also carry a `?v=3` cache-busting query string; **bump that version number** if you ever edit a JS/CSS file and need to guarantee a stale-cache-proof reload for the user.

The server binds to `127.0.0.1` only. It is **not** reachable from other devices (phone, etc.) — that was evaluated and intentionally not set up because the laptop is sometimes on school wifi and opening the port safely would need admin-elevated `netsh` commands the user chose to skip for now. See decisions.md if this comes up again.

Opening `index.html` directly via `file://` also works in a real browser (plain relative paths, no ES modules), but **not** in Claude's own sandboxed Browser-pane preview — that renders local `file://` pages as an isolated snapshot that can't fetch sibling files. Always use the `preview_start`/`localhost:8791` route to test visually inside a Claude session.

## File structure

```
index.html              All markup (header, hero, leaderboard, activity feed, footer, modal mount point)
css/styles.css           Custom CSS on top of Tailwind CDN utilities
js/
  actors.js               ACTORS array + SEED_ACTIVITY — THE DATA SOURCE OF TRUTH
  fanLevel.js              FAN_LEVELS tiers + getFanLevel()/getNextFanLevel()
  icons.js                 Icons.* — inline SVG UI icon set (no emoji, and NO crown — see below)
  store.js                 Store — all app state, localStorage persistence, contribution logic
  render.js                Leaderboard/activity DOM rendering, rank/level badge helpers
  fan-card.js               FanCard.html()/download() — the shareable card (on-screen + downloadable PNG)
  support-flow.js           SupportFlow — the amount → name → celebration modal
  main.js                   Bootstraps rendering + wires top-level event listeners
assets/
  actors/*.jpg              Real licensed actor photos (20), filenames = actor slug
  logo/                    crown-mark.png, wordmark-mark.png, fanwarsindia-logo.png — the REAL brand logo (see decisions.md)
  hero/hero-bg.jpg           Hero background photo (patched + brightened, see decisions.md)
scripts/                  One-off PowerShell/bash tools used to build the above assets (kept for reproducibility, not run automatically)
.claude/launch.json       Browser-pane preview config (runs scripts/serve.ps1)
```

## Data model (current: in-memory + localStorage; see progress.md for the real-DB target shape)

`ACTORS` in `js/actors.js` — the single source of truth for the roster:
```js
{ id, name, slug, nickname, image, fan_power, fan_army }
```
`fan_power`/`fan_army` are currently **0 for all actors** (reset intentionally — see decisions.md; they are not meant to look like real numbers before there's a real backend).

`Store` in `js/store.js` wraps this with mutable state (`contributions`, `activity`, `leaderboardMode`) and persists to `localStorage` under key `fanwarsindia_demo_state_v1`. **Important**: on load it merges — static fields (name/slug/nickname/image) and roster membership always come from the fresh `ACTORS` array; only `fan_power`/`fan_army` are carried over from a prior visit's localStorage snapshot. Never change this back to a wholesale `state.actors = persisted.actors` replace — that reintroduces a real bug that once made every code change invisible to a returning visitor (full story in decisions.md).

## Design system quick reference

- **Fonts**: `Anton` (display/headline, all-caps, via `.font-display`) + `Barlow Condensed` (body, via `.font-body`), both Google Fonts.
- **Brand colors** (Tailwind config in `index.html`): `fwblack #050505`, `fwwhite #FFFFFF`, `fwred #FF1A1A`, `fwdeepred #B00000`.
- **No emoji as UI icons.** Use `Icons.*` from `js/icons.js` (flame, crowd, close, back, whatsapp, x, instagram, link, download). The only remaining literal emoji in the codebase is the 🇮🇳 flag next to "Telugu Fan Wars" (contextual, not decorative/icon use) — leave it.
- **The crown is always the logo's crown.** Any crown anywhere in the UI (rank #1 badge, Legend badge, header, fan card) must be `assets/logo/crown-mark.png` — use `brandCrownHTML(heightPx)` in `render.js`. There used to be a generic line-art `Icons.crown`; it was deleted because it looked off-brand next to the logo's brush-painted crown. Do not add a crown back to `icons.js`.
- **Rank display**: top-3 leaderboard cards use `rank-glow-{1,2,3}` CSS classes + a numeral (`01`/`02`/`03`) + the brand crown for #1. Never use medal emoji (🥇🥈🥉) — that was explicitly replaced for looking "gamified app" rather than "movie fandom."
- **Fan levels**: `FAN_LEVELS` in `js/fanLevel.js` — Supporter (₹1–99) → Fan (₹100–499) → Superfan (₹500–1999) → Die-hard (₹2000–9999) → Legend (₹10000+). Each has a `color`; render via a small colored dot (or the brand crown for Legend) — see `levelBadgeHTML()` in `render.js`. No emoji circles.
- **Star naming format**: Support buttons and the "You just backed…" screen (and the "Backing … with" line) all use `actorTitle(actor)` from `render.js` → "Superstar Mahesh Babu" (nickname + name). If the nickname is just the actor's own first name (Akhil, Rana, Sharwa) it returns the name alone, to avoid "Akhil Akhil Akkineni". Use this helper for any new place that names a star; don't hand-build the string. Rank 4+ rows are icon-only buttons (no room for the long label) with the full text in `aria-label`/`title`.
- **Logo usage**: `crown-mark.png` + `wordmark-mark.png` are cropped from the user's real logo file and are meant to be composed **crown-above-wordmark** (vertically stacked), never side-by-side — that was a real bug fixed mid-project. `fanwarsindia-logo.png` is the full pre-composed lockup (crown + wordmark + tagline in one image) used in the hero and footer where a large, exact reproduction is wanted. It is **trimmed to its visible content** (`scripts/trim-transparent.ps1`) — the original export had ~11% transparent padding above the crown, which was a big part of a "too much empty space above the logo" complaint. If the logo is ever re-exported, re-run the trim after `make-transparent.ps1`. The hero is top-aligned with minimal top padding for the same reason; don't re-centre it vertically.
- **Actor cards**: portrait aspect ~4:5, `object-cover`. Real photos live in `assets/actors/*.jpg`.
- Copy tone: no "Demo", "Prototype", "V1", "No login/No OTP" language anywhere in user-facing text — the site should read as a finished product even though it's functionally a prototype. Do not reintroduce that language without the user asking.

## Hard constraints — do not violate without asking the user first

1. **No real actor photos may be sourced by Claude from the web.** Copyright + Indian personality/publicity-rights exposure (live litigation precedent: Anil Kapoor, Amitabh Bachchan, Jackie Shroff). The current 20 photos were supplied by the user directly (see decisions.md) — only add/replace actor images when the user hands you a local file path.
2. **No AI-generated actor images either** — user explicitly declined this route too.
3. Don't expose the local dev server beyond `127.0.0.1` without re-confirming the network safety context with the user (see decisions.md — school wifi consideration).
4. Don't add a build step / npm / framework without checking first (see Stack section above).
