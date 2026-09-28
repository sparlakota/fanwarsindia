/**
 * FanWarsIndia — app state, backed by Supabase.
 *
 * Reads: public_leaderboard / public_activity / public_top_fans (aggregates only, no phone numbers).
 * Writes: never directly. A support goes create-order -> Cashfree checkout -> Cashfree confirms ->
 * the server marks it paid. The browser can't credit anything by itself.
 *
 * The roster's display fields (name, nickname, photo) still come from js/actors.js; only the
 * numbers come from the server.
 */

const Store = (function () {
  // Old frontend-only builds kept fake contributions here; they must not linger.
  try {
    localStorage.removeItem("fanwarsindia_demo_state_v1");
  } catch (e) {
    /* storage blocked — nothing to clean */
  }

  const state = {
    actors: ACTORS.map((a) => ({ ...a, fan_power: 0, fan_army: 0 })),
    activity: [], // {id, name, actorSlug, amount, created_at}
    topFans: [], // raw public_top_fans rows
    leaderboardMode: "power", // 'power' | 'army' | 'fans'
    loaded: false,
    loadError: false,
  };

  const listeners = new Set();

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  const key = FW_CONFIG.supabaseAnonKey;
  const baseHeaders = { apikey: key, Authorization: `Bearer ${key}` };

  async function rpc(name, args) {
    const res = await fetch(`${FW_CONFIG.supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { ...baseHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(args || {}),
    });
    if (!res.ok) throw new Error(`${name} failed (${res.status})`);
    return res.json();
  }

  async function load() {
    try {
      const [board, activity, fans] = await Promise.all([
        rpc("public_leaderboard"),
        rpc("public_activity"),
        rpc("public_top_fans", { p_limit: 20 }),
      ]);
      const byId = new Map(board.map((r) => [Number(r.id), r]));
      state.actors = ACTORS.map((a) => {
        const r = byId.get(a.id);
        return { ...a, fan_power: r ? Number(r.fan_power) : 0, fan_army: r ? Number(r.fan_army) : 0 };
      });
      state.activity = activity.map((x) => ({
        id: x.id,
        name: x.supporter_name,
        actorSlug: x.actor_slug,
        amount: Number(x.amount),
        created_at: Date.parse(x.created_at),
      }));
      state.topFans = fans;
      state.loaded = true;
      state.loadError = false;
    } catch (e) {
      state.loadError = true;
    }
    emit();
  }

  function getActorBySlug(slug) {
    return state.actors.find((a) => a.slug === slug);
  }

  function getActorById(id) {
    return state.actors.find((a) => a.id === Number(id));
  }

  // Ties keep roster order (Array.prototype.sort is stable).
  function getLeaderboard(mode) {
    const k = mode === "army" ? "fan_army" : "fan_power";
    return [...state.actors].sort((a, b) => b[k] - a[k]);
  }

  function getRank(actorId, mode) {
    const idx = getLeaderboard(mode).findIndex((a) => a.id === actorId);
    return idx === -1 ? null : idx + 1;
  }

  /** Individual fans (one per phone number) ranked by total contributed. */
  function getTopFans(limit) {
    const fans = state.topFans.map((f) => ({
      name: f.name,
      phoneLast4: f.phone_last4,
      total: Number(f.total),
      count: Number(f.supports),
      starsBacked: Number(f.stars_backed),
      topActor: getActorById(f.top_actor_id) || null,
    }));
    return limit ? fans.slice(0, limit) : fans;
  }

  async function callFunction(path, init) {
    let res;
    try {
      res = await fetch(`${FW_CONFIG.supabaseUrl}/functions/v1/${path}`, {
        ...init,
        headers: { ...baseHeaders, ...(init && init.headers) },
      });
    } catch (e) {
      const err = new Error("network");
      err.code = "network";
      throw err;
    }
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      /* non-JSON error page */
    }
    if (!res.ok) {
      const err = new Error((body && body.error) || `http_${res.status}`);
      err.code = (body && body.error) || `http_${res.status}`;
      throw err;
    }
    return body;
  }

  /** -> { order_id, payment_session_id, environment } */
  function createOrder({ actorId, amount, name, phone }) {
    return callFunction("create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor_id: actorId, amount, name, phone }),
    });
  }

  /** -> { status: 'pending'|'success'|'failed', ... } */
  function getOrderStatus(orderId) {
    return callFunction(`order-status?order_id=${encodeURIComponent(orderId)}`, { method: "GET" });
  }

  return {
    state,
    subscribe,
    load,
    getActorBySlug,
    getActorById,
    getLeaderboard,
    getRank,
    getTopFans,
    createOrder,
    getOrderStatus,
    setLeaderboardMode(mode) {
      state.leaderboardMode = mode === "army" || mode === "fans" ? mode : "power";
      emit();
    },
  };
})();
