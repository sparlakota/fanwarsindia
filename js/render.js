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
  const powerBtn = document.getElementById("toggle-power");
  const armyBtn = document.getElementById("toggle-army");
  [powerBtn, armyBtn].forEach((btn) => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle("bg-fwred", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("text-white/60", !active);
    btn.style.boxShadow = active ? "0 8px 20px -8px rgba(255,26,26,0.6)" : "none";
  });
}

function rankNumeral(rank) {
  return rank < 10 ? `0${rank}` : `${rank}`;
}

function actorCardHTML(actor, rank, mode) {
  const isTop3 = rank <= 3;
  const metricValue = mode === "army" ? formatCount(actor.fan_army) + " fans" : formatRupees(actor.fan_power);
  const secondaryLabel =
    mode === "army"
      ? `${formatRupees(actor.fan_power)} fan power`
      : `${formatCount(actor.fan_army)} fan army`;

  if (isTop3) {
    return `
    <article
      class="actor-card card-grain relative rounded-lg border ${rankBadgeClasses(rank)} ${rankBackgroundClasses(rank)} p-4 flex flex-col gap-4 rise-in"
      data-actor-id="${actor.id}"
      style="animation-delay:${rank * 60}ms"
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
          <h3 class="font-display uppercase tracking-wide truncate text-lg sm:text-xl">${actor.name}</h3>
          <p class="text-fwred/90 text-xs uppercase tracking-[0.12em] truncate">${actor.nickname}</p>
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
    style="animation-delay:${Math.min(rank, 10) * 40}ms"
  >
    <div class="flex items-center gap-3">
      <div class="font-display shrink-0 text-fwred/80 text-base w-7 text-center leading-none">${rankNumeral(rank)}</div>

      <img
        src="${actor.image}"
        alt="${actor.name}"
        class="shrink-0 rounded-md object-cover border border-white/10 w-11 h-14"
      />

      <div class="min-w-0 flex-1">
        <h3 class="font-display uppercase tracking-wide truncate text-sm sm:text-base leading-tight">${actor.name}</h3>
        <p class="text-white/35 text-[10px] uppercase tracking-wide truncate">${actor.nickname}</p>
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

function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const mode = Store.state.leaderboardMode;
  const board = Store.getLeaderboard(mode);
  list.innerHTML = board.map((actor, i) => actorCardHTML(actor, i + 1, mode)).join("");
  renderToggle(mode);
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
  const items = Store.state.activity.slice(0, 8);
  list.innerHTML = items.length
    ? items.map(activityItemHTML).join("")
    : `<p class="text-white/40 text-sm py-6 text-center">No fan activity yet — be the first to back your star.</p>`;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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
