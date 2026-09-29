/**
 * FanWarsIndia — DOM rendering helpers (vanilla JS, no framework/build step).
 */

function formatRupees(amount) {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

function formatCount(n) {
  return Math.round(n).toLocaleString("en-IN");
}

function timeAgo(ts) {
  const diffMs = Date.now() - ts;
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1 hr ago";
  if (hrs < 24) return `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function rankBadgeClasses(rank) {
  if (rank === 1) return "rank-glow-1 border-fwred/70";
  if (rank === 2) return "rank-glow-2 border-fwred/40";
  if (rank === 3) return "rank-glow-3 border-fwred/25";
  return "border-white/10";
}

/** A faint warm tint behind top-3 cards so they read as "elite" without a badge/medal. */
function rankBackgroundClasses(rank) {
  if (rank === 1) return "bg-gradient-to-br from-fwred/[0.14] via-fwblack to-fwblack";
  if (rank === 2) return "bg-gradient-to-br from-fwred/[0.09] via-fwblack to-fwblack";
  if (rank === 3) return "bg-gradient-to-br from-fwred/[0.06] via-fwblack to-fwblack";
  return "bg-white/[0.03]";
}

/**
 * "Superstar Mahesh Babu" — the one title format used on Support buttons and the
 * "You just backed…" screen. When the nickname is just the actor's own first
 * name ("Akhil" / "Rana" / "Sharwa"), repeating it reads as a typo, so use the name alone.
 */
function actorTitle(actor) {
  const nick = (actor.nickname || "").trim();
  if (!nick || actor.name.toLowerCase().startsWith(nick.toLowerCase())) return actor.name;
  return `${nick} ${actor.name}`;
}

/** The exact crown from the brand logo (never the generic line-art Icons set). */
function brandCrownHTML(heightPx, extraClass) {
  return `<img src="assets/logo/crown-mark.png" alt="" class="inline-block object-contain ${extraClass || ""}" style="height:${heightPx}px;width:auto" />`;
}

/** Small colored dot for tiers, or the brand crown for Legend — no emoji. */
function levelBadgeHTML(level, sizePx) {
  const size = sizePx || 14;
  if (level.key === "legend") {
    return `<span class="inline-flex items-center align-middle">${brandCrownHTML(Math.round(size * 1.3))}</span>`;
  }
  return `<span class="inline-block rounded-full align-middle" style="width:${size}px;height:${size}px;background:${level.color}"></span>`;
}

function renderToggle(mode) {
  ["toggle-power", "toggle-army", "toggle-fans"].forEach((id) => {
    const btn = document.getElementById(id);
    const active = btn.dataset.mode === mode;
    btn.classList.toggle("bg-fwred", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("text-white/60", !active);
    btn.style.boxShadow = active ? "0 8px 20px -8px rgba(255,26,26,0.6)" : "none";
  });
}

function rankNumeral(rank) {
  if (!rank) return "—"; // unranked
  return rank < 10 ? `0${rank}` : `${rank}`;
}

function actorCardHTML(actor, position, mode) {
  // A star nobody has backed yet is unranked ("—", no highlight): 13 zeros numbered 01–13 read as fake standings.
  const hasScore = (mode === "army" ? actor.fan_army : actor.fan_power) > 0;
  const rank = hasScore ? position : 0;
  const isTop3 = hasScore && rank <= 3;
  const metricValue =
    mode === "army"
      ? `${formatCount(actor.fan_army)} ${actor.fan_army === 1 ? "fan" : "fans"}`
      : formatRupees(actor.fan_power);
  const secondaryLabel =
    mode === "army"
      ? `Fan Army · ${formatRupees(actor.fan_power)} fan power`
      : `Fan Power · ${formatCount(actor.fan_army)} ${actor.fan_army === 1 ? "fan" : "fans"}`;

  if (isTop3) {
    return `
    <article
      class="actor-card card-grain relative rounded-lg border ${rankBadgeClasses(rank)} ${rankBackgroundClasses(rank)} p-4 flex flex-col gap-4 rise-in"
      data-actor-id="${actor.id}"
      style="animation-delay:${position * 60}ms"
    >
      <div class="flex items-center gap-3">
        <div class="shrink-0 w-12 text-center leading-none">
          ${rank === 1 ? `<span class="block mb-0.5">${brandCrownHTML(20)}</span>` : ""}
          <span class="font-display text-fwred text-3xl">${rankNumeral(rank)}</span>
        </div>
        <img
          src="${actor.image}"
          alt="${actor.name}"
          class="shrink-0 rounded-md object-cover border border-white/10 w-16 h-20 sm:w-20 sm:h-24"
        />
        <div class="min-w-0 flex-1">
          <h3 class="font-name font-semibold uppercase tracking-wide truncate text-xl sm:text-2xl leading-tight">${actor.name}</h3>
          <p class="font-name font-medium text-fwred/90 text-[13px] uppercase tracking-[0.14em] truncate">${actor.nickname}</p>
        </div>
      </div>

      <div>
        <p class="font-display text-fwwhite metric-value text-3xl sm:text-4xl leading-none break-all">${metricValue}</p>
        <p class="text-white/40 text-[11px] mt-1 truncate">${secondaryLabel}</p>
      </div>

      <button
        class="support-btn fire-btn tap-active w-full rounded-sm font-display uppercase text-sm py-3 px-3 flex items-center justify-center gap-2 text-center leading-tight"
        data-actor-id="${actor.id}"
      >
        <span class="w-4 h-4 shrink-0">${Icons.flame()}</span>
        <span>Support ${actorTitle(actor)}</span>
      </button>
    </article>`;
  }

  return `
  <article
    class="actor-card card-grain relative rounded-lg border ${rankBadgeClasses(rank)} ${rankBackgroundClasses(rank)} p-3 flex flex-col gap-3 rise-in"
    data-actor-id="${actor.id}"
    style="animation-delay:${Math.min(position, 10) * 40}ms"
  >
    <div class="flex items-center gap-3">
      <div class="font-display shrink-0 ${hasScore ? "text-fwred/80" : "text-white/30"} text-base w-7 text-center leading-none">${rankNumeral(rank)}</div>

      <img
        src="${actor.image}"
        alt="${actor.name}"
        class="shrink-0 rounded-md object-cover border border-white/10 w-11 h-14"
      />

      <div class="min-w-0 flex-1">
        <h3 class="font-name font-semibold uppercase tracking-wide truncate text-base sm:text-lg leading-tight">${actor.name}</h3>
        <p class="font-name font-medium text-white/50 text-[11px] uppercase tracking-[0.14em] truncate">${actor.nickname}</p>
        <p class="font-display text-fwwhite metric-value text-base sm:text-lg leading-tight truncate">${metricValue}</p>
      </div>
    </div>

    <button
      class="support-btn fire-btn tap-active w-full rounded-sm font-display uppercase text-xs py-2.5 px-3 flex items-center justify-center gap-2 text-center leading-tight"
      data-actor-id="${actor.id}"
    >
      <span class="w-3.5 h-3.5 shrink-0">${Icons.flame()}</span>
      <span>Support ${actorTitle(actor)}</span>
    </button>
  </article>`;
}

function topFanCardHTML(fan, rank) {
  const isTop3 = rank <= 3;
  const level = getFanLevel(fan.total);
  const star = fan.topActor;
  const backing = star
    ? `Backing ${actorTitle(star)}${fan.starsBacked > 1 ? ` +${fan.starsBacked - 1} more` : ""}`
    : "";

  return `
  <article
    class="card-grain relative rounded-lg border ${rankBadgeClasses(rank)} ${rankBackgroundClasses(rank)} ${isTop3 ? "p-4" : "p-3"} flex items-center gap-3 rise-in"
    style="animation-delay:${Math.min(rank, 10) * 40}ms"
  >
    <div class="shrink-0 ${isTop3 ? "w-12" : "w-7"} text-center leading-none">
      ${rank === 1 ? `<span class="block mb-0.5">${brandCrownHTML(20)}</span>` : ""}
      <span class="font-display ${isTop3 ? "text-fwred text-3xl" : "text-fwred/80 text-base"}">${rankNumeral(rank)}</span>
    </div>
    ${
      star
        ? `<img src="${star.image}" alt="${escapeHTML(star.name)}" class="shrink-0 rounded-md object-cover border border-white/10 ${isTop3 ? "w-14 h-[4.5rem]" : "w-11 h-14"}" />`
        : ""
    }
    <div class="min-w-0 flex-1">
      <h3 class="font-name font-semibold uppercase tracking-wide truncate ${isTop3 ? "text-xl sm:text-2xl" : "text-base sm:text-lg"} leading-tight">${escapeHTML(fan.name)}</h3>
      <p class="font-name font-medium text-fwred/90 text-[12px] uppercase tracking-[0.12em] leading-snug">${backing}</p>
      <p class="mt-0.5 text-white/45 text-[11px] flex items-center gap-1.5">${levelBadgeHTML(level, 10)} ${level.label}${
        fan.phoneLast4 ? `<span class="text-white/25">·</span><span title="Last 4 digits of their number">••${escapeHTML(fan.phoneLast4)}</span>` : ""
      }</p>
    </div>
    <div class="shrink-0 text-right">
      <p class="font-display metric-value ${isTop3 ? "text-2xl sm:text-3xl" : "text-lg"} leading-none">${formatRupees(fan.total)}</p>
      <p class="text-white/35 text-[10px] mt-1 uppercase tracking-wide">${fan.count} ${fan.count === 1 ? "support" : "supports"}</p>
    </div>
  </article>`;
}

function skeletonCardsHTML(count) {
  return Array.from(
    { length: count },
    (_, i) => `
    <div class="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3 animate-pulse" aria-hidden="true">
      <div class="w-7 h-4 rounded bg-white/10"></div>
      <div class="w-11 h-14 rounded-md bg-white/10"></div>
      <div class="flex-1 space-y-2">
        <div class="h-4 rounded bg-white/10" style="width:${55 - i * 6}%"></div>
        <div class="h-3 w-1/4 rounded bg-white/[0.07]"></div>
      </div>
    </div>`
  ).join("");
}

function loadErrorHTML(what) {
  return `
  <div class="rounded-lg border border-white/10 bg-white/[0.03] px-6 py-8 text-center">
    <p class="text-white/70 text-sm mb-4">Couldn't load ${what}. Check your connection.</p>
    <button class="retry-load chip-outline tap-active rounded-md px-5 py-2.5 font-display uppercase text-sm">Try again</button>
  </div>`;
}

function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const mode = Store.state.leaderboardMode;
  renderToggle(mode);
  // Never show "everyone at ₹0" before the real numbers arrive — it reads as a wiped leaderboard.
  if (!Store.state.loaded) {
    list.innerHTML = Store.state.loadError ? loadErrorHTML("the leaderboard") : skeletonCardsHTML(5);
    return;
  }
  if (mode === "fans") {
    const fans = Store.getTopFans(20);
    list.innerHTML = fans.length
      ? fans.map((fan, i) => topFanCardHTML(fan, i + 1)).join("")
      : `<div class="rounded-lg border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
           <p class="font-display uppercase text-xl mb-2">No fans on the board yet</p>
           <p class="text-white/50 text-sm">Back your star and your name lands here — biggest supporters rise to the top.</p>
         </div>`;
  } else {
    const board = Store.getLeaderboard(mode);
    list.innerHTML = board.map((actor, i) => actorCardHTML(actor, i + 1, mode)).join("");
  }
}

function activityItemHTML(item) {
  const actor = Store.getActorBySlug(item.actorSlug);
  if (!actor) return "";
  return `
  <div class="flex items-center gap-3 py-3">
    <img src="${actor.image}" alt="" class="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
    <p class="text-sm text-white/80 min-w-0 flex-1">
      <span class="text-fwwhite font-semibold">${escapeHTML(item.name)}</span>
      just supported <span class="text-fwred font-semibold">${actor.name}</span>
      with <span class="text-fwwhite font-semibold">${formatRupees(item.amount)}</span>
    </p>
    <span class="text-[11px] text-white/35 shrink-0">${timeAgo(item.created_at)}</span>
  </div>`;
}

function renderActivity() {
  const list = document.getElementById("activity-list");
  if (!Store.state.loaded) {
    list.innerHTML = Store.state.loadError
      ? `<p class="text-white/40 text-sm py-6 text-center">Couldn't load fan activity.</p>`
      : Array.from(
          { length: 3 },
          () => `<div class="flex items-center gap-3 py-3 animate-pulse" aria-hidden="true">
                   <div class="w-9 h-9 rounded-full bg-white/10 shrink-0"></div>
                   <div class="h-3 flex-1 rounded bg-white/10"></div>
                 </div>`
        ).join("");
    return;
  }
  const items = Store.state.activity.slice(0, 8);
  list.innerHTML = items.length
    ? items.map(activityItemHTML).join("")
    : `<p class="text-white/40 text-sm py-6 text-center">No fan activity yet — be the first to back your star.</p>`;
}

// Safe for text AND attribute values (quotes included) — fan names come from strangers.
function escapeHTML(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function flashMetric(actorId) {
  const card = document.querySelector(`.actor-card[data-actor-id="${actorId}"] .metric-value`);
  if (!card) return;
  card.classList.remove("num-flash");
  // reflow to restart animation
  void card.offsetWidth;
  card.classList.add("num-flash");
}

function renderAll() {
  renderLeaderboard();
  renderActivity();
}
