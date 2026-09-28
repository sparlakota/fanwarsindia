// GET ?order_id=... -> the contribution's status plus everything the celebration screen needs.
// Re-checks with Cashfree when still pending, so a slow or missed webhook never strands a fan.
import { cashfreeConfig, corsHeaders, db, json, syncOrder } from "../_shared/common.ts";

type BoardRow = { id: number; sort_order: number; fan_power: number };

function rankOf(board: BoardRow[], actorId: number): number {
  const sorted = [...board].sort((a, b) => b.fan_power - a.fan_power || a.sort_order - b.sort_order);
  return sorted.findIndex((r) => r.id === actorId) + 1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "GET") return json(req, { error: "method_not_allowed" }, 405);

  const orderId = new URL(req.url).searchParams.get("order_id") ?? "";
  if (!/^fw_[a-z0-9_]{6,40}$/.test(orderId)) return json(req, { error: "invalid_order" }, 400);

  const supabase = db();
  const cf = cashfreeConfig();

  let row;
  if (cf) {
    row = await syncOrder(supabase, cf, orderId);
  } else {
    const { data } = await supabase.from("contributions").select("*").eq("cashfree_order_id", orderId).maybeSingle();
    row = data;
  }
  if (!row) return json(req, { error: "not_found" }, 404);

  const base = {
    order_id: orderId,
    status: row.status,
    actor_id: row.actor_id,
    amount: row.amount,
    name: row.supporter_name,
    card_token: row.card_token,
  };
  if (row.status !== "success") return json(req, base);

  const [{ data: board }, { data: mine }] = await Promise.all([
    supabase.rpc("public_leaderboard", { p_include_test: row.is_test }), // rank among the same kind of payments
    supabase
      .from("contributions")
      .select("amount")
      .eq("actor_id", row.actor_id)
      .eq("supporter_phone", row.supporter_phone)
      .eq("status", "success"),
  ]);

  const rows = (board ?? []) as BoardRow[];
  const me = rows.find((r) => r.id === row.actor_id);
  const newFanPower = me ? Number(me.fan_power) : row.amount;
  const before = rows.map((r) => (r.id === row.actor_id ? { ...r, fan_power: Number(r.fan_power) - row.amount } : r));

  return json(req, {
    ...base,
    cumulative: (mine ?? []).reduce((sum: number, c: { amount: number }) => sum + c.amount, 0),
    new_fan_power: newFanPower,
    previous_fan_power: newFanPower - row.amount,
    new_rank: rankOf(rows, row.actor_id),
    previous_rank: rankOf(before, row.actor_id),
  });
});
