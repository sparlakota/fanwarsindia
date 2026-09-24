/**
 * FanWarsIndia — Frontend-only state store.
 *
 * No backend yet. Everything here is designed so a real API can slot in later:
 * addContribution() is the one place a POST /api/contributions call would go,
 * and getLeaderboard() is where a GET /api/leaderboard?sort= call would go.
 *
 * State is mirrored to localStorage purely so a demo doesn't reset on refresh.
 * This is NOT a substitute for a real database.
 */

const STORAGE_KEY = "fanwarsindia_demo_state_v1";

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function savePersisted(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    /* private mode / storage disabled — demo continues in-memory only */
  }
}

const Store = (function () {
  const persisted = loadPersisted();

  const state = {
    actors: ACTORS.map((a) => ({ ...a })),
    contributions: [], // {id, actor_id, supporter_name, amount, token, created_at}
    activity: SEED_ACTIVITY.map((a, i) => ({
      id: `seed-${i}`,
      name: a.name,
      actorSlug: a.actorSlug,
      amount: a.amount,
      created_at: Date.now() - a.minutesAgo * 60 * 1000,
      seed: true,
    })),
    leaderboardMode: "power", // 'power' | 'army' | 'fans'
  };

  // Merge, don't replace: static fields (name/slug/nickname/image) and the
  // roster itself always come from the current ACTORS source of truth, so a
  // code update (new photo, renamed nickname, added/removed actor) always
  // takes effect. Only the mutable stats carry over from a prior visit.
  if (persisted && Array.isArray(persisted.actors)) {
    const persistedById = new Map(persisted.actors.map((a) => [a.id, a]));
    state.actors = state.actors.map((actor) => {
      const prev = persistedById.get(actor.id);
      return prev
        ? { ...actor, fan_power: prev.fan_power, fan_army: prev.fan_army }
        : actor;
    });
    state.contributions = persisted.contributions || [];
    if (Array.isArray(persisted.activity) && persisted.activity.length) {
      state.activity = persisted.activity;
    }
  }

  const listeners = new Set();

  function persist() {
    savePersisted({
      actors: state.actors,
      contributions: state.contributions,
      activity: state.activity,
    });
  }

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function getActorBySlug(slug) {
    return state.actors.find((a) => a.slug === slug);
  }

  function getLeaderboard(mode) {
    const key = mode === "army" ? "fan_army" : "fan_power";
    return [...state.actors].sort((a, b) => b[key] - a[key]);
  }

  function getRank(actorId, mode) {
    const board = getLeaderboard(mode);
    const idx = board.findIndex((a) => a.id === actorId);
    return idx === -1 ? null : idx + 1;
  }

  /** Cumulative amount a given supporter name has ever put behind an actor (demo-only, name is the only identity we have). */
  function getSupporterCumulative(actorId, supporterName) {
    const normalized = (supporterName || "").trim().toLowerCase();
    if (!normalized) return 0;
    return state.contributions
      .filter(
        (c) =>
          c.actor_id === actorId &&
          c.supporter_name.trim().toLowerCase() === normalized
      )
      .reduce((sum, c) => sum + c.amount, 0);
  }

  function isNewSupporter(actorId, supporterName) {
    return getSupporterCumulative(actorId, supporterName) === 0;
  }

  /**
   * Individual fans ranked by total contributed across all stars (demo identity =
   * name; the real backend will key this on verified phone number).
   * Each entry also carries the star that fan has put the most behind.
   */
  function getTopFans(limit) {
    const byFan = new Map();
    state.contributions.forEach((c) => {
      const key = c.supporter_name.trim().toLowerCase();
      if (!key) return;
      let fan = byFan.get(key);
      if (!fan) {
        fan = { name: c.supporter_name.trim(), total: 0, count: 0, perActor: new Map() };
        byFan.set(key, fan);
      }
      fan.total += c.amount;
      fan.count += 1;
      fan.perActor.set(c.actor_id, (fan.perActor.get(c.actor_id) || 0) + c.amount);
    });

    const fans = [...byFan.values()].map((fan) => {
      let topActorId = null;
      let topAmount = -1;
      fan.perActor.forEach((amount, actorId) => {
        if (amount > topAmount) {
          topAmount = amount;
          topActorId = actorId;
        }
      });
      return {
        name: fan.name,
        total: fan.total,
        count: fan.count,
        topActor: state.actors.find((a) => a.id === topActorId) || null,
        starsBacked: fan.perActor.size,
      };
    });

    fans.sort((a, b) => b.total - a.total);
    return limit ? fans.slice(0, limit) : fans;
  }

  /** Short shareable card serial, e.g. FW-7K2Q9M (no look-alike characters). */
  function makeCardToken() {
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let out = "";
    for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `FW-${out}`;
  }

  /**
   * Simulated contribution. In a real backend this is where we'd call
   * POST /api/contributions { actor_id, supporter_name, amount } and a
   * payment provider webhook would confirm before this ever ran.
   */
  function addContribution(actorId, amount, supporterName) {
    const actor = state.actors.find((a) => a.id === actorId);
    if (!actor) throw new Error("Unknown actor");

    const cleanAmount = Math.max(1, Math.round(Number(amount) || 0));
    const cleanName = (supporterName || "Fan").trim().slice(0, 40) || "Fan";
    const firstTime = isNewSupporter(actorId, cleanName);

    const contribution = {
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actor_id: actorId,
      supporter_name: cleanName,
      amount: cleanAmount,
      token: makeCardToken(),
      created_at: Date.now(),
    };

    const previousFanPower = actor.fan_power;
    const previousRank = getRank(actorId, state.leaderboardMode);

    state.contributions.unshift(contribution);
    actor.fan_power += cleanAmount;
    if (firstTime) actor.fan_army += 1;

    state.activity.unshift({
      id: contribution.id,
      name: cleanName,
      actorSlug: actor.slug,
      amount: cleanAmount,
      created_at: contribution.created_at,
      seed: false,
    });
    state.activity = state.activity.slice(0, 30);

    persist();
    emit();

    const newRank = getRank(actorId, state.leaderboardMode);
    const cumulative = getSupporterCumulative(actorId, cleanName);

    return {
      actor,
      contribution,
      previousFanPower,
      newFanPower: actor.fan_power,
      previousRank,
      newRank,
      cumulative,
      firstTime,
      level: getFanLevel(cumulative),
    };
  }

  return {
    state,
    subscribe,
    getActorBySlug,
    getLeaderboard,
    getRank,
    getSupporterCumulative,
    getTopFans,
    addContribution,
    setLeaderboardMode(mode) {
      state.leaderboardMode = mode === "army" || mode === "fans" ? mode : "power";
      emit();
    },
  };
})();
