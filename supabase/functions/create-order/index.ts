// POST { actor_id, amount, name, phone } -> { order_id, checkout_url, environment }
// Creates a pending contribution and a Dodo checkout session for it. Nothing is credited here —
// that only happens in syncOrder() once Dodo reports the payment as succeeded.
import {
  corsHeaders,
  db,
  dodoConfig,
  dodoHeaders,
  isProductionSite,
  json,
  returnBaseFor,
} from "../_shared/common.ts";

const MIN_AMOUNT = 49; // the Dodo product's minimum price (₹49); lower it in Dodo first if this ever changes
const MAX_AMOUNT = 100000;
const MAX_PENDING_PER_PHONE = 5; // per 10 minutes
// Per connection, unpaid orders only. Generous because Indian mobile carriers put many users behind one IP.
const MAX_UNPAID_PER_IP = 30; // per 10 minutes

async function ipHash(req: Request): Promise<string | null> {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) return null;
  const pepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${pepper}`));
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(raw: unknown): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function randomToken(len: number, alphabet: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const dodo = dodoConfig();
  if (!dodo) return json(req, { error: "payments_not_configured" }, 503);
  // Until live keys are in (DODO_ENV=live_mode), fanwarsindia.com itself can't take test payments.
  if (dodo.mode === "test_mode" && isProductionSite(req.headers.get("origin") ?? "")) {
    return json(req, { error: "payments_not_configured" }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const actorId = Number(body.actor_id);
  const amount = Math.round(Number(body.amount));
  const name = String(body.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const phone = normalizePhone(body.phone);

  if (!Number.isInteger(actorId)) return json(req, { error: "invalid_actor" }, 400);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return json(req, { error: "invalid_amount" }, 400);
  }
  if (!name) return json(req, { error: "invalid_name" }, 400);
  if (!phone) return json(req, { error: "invalid_phone" }, 400);

  const supabase = db();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const clientIpHash = await ipHash(req);

  // Independent checks run in parallel — each one is a round trip to the database.
  const [{ data: actor }, { count: phoneCount }, ipCount] = await Promise.all([
    supabase.from("actors").select("id, name").eq("id", actorId).maybeSingle(),
    supabase
      .from("contributions")
      .select("id", { count: "exact", head: true })
      .eq("supporter_phone", phone)
      .eq("status", "pending")
      .gte("created_at", since),
    clientIpHash
      ? supabase
          .from("contributions")
          .select("id", { count: "exact", head: true })
          .eq("client_ip_hash", clientIpHash)
          .neq("status", "success")
          .gte("created_at", since)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
  ]);
  if (!actor) return json(req, { error: "invalid_actor" }, 400);
  if ((phoneCount ?? 0) >= MAX_PENDING_PER_PHONE || ipCount >= MAX_UNPAID_PER_IP) {
    return json(req, { error: "too_many_attempts" }, 429);
  }

  const orderId = `fw_${Date.now().toString(36)}_${randomToken(8, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
  const cardToken = `FW-${randomToken(6, "23456789ABCDEFGHJKLMNPQRSTUVWXYZ")}`;

  const { error: insErr } = await supabase.from("contributions").insert({
    actor_id: actorId,
    supporter_name: name,
    supporter_phone: phone,
    amount,
    cashfree_order_id: orderId, // column name predates Dodo: it holds OUR order reference
    card_token: cardToken,
    client_ip_hash: clientIpHash,
    is_test: dodo.mode === "test_mode", // hidden from the live site's leaderboards
    status: "pending",
  });
  if (insErr) {
    console.error("insert failed", insErr);
    return json(req, { error: "server_error" }, 500);
  }

  const returnBase = returnBaseFor(req.headers.get("origin") ?? "");

  const dRes = await fetch(`${dodo.base}/checkouts`, {
    method: "POST",
    headers: dodoHeaders(dodo),
    body: JSON.stringify({
      // Pay-what-you-want product: amount is in paise and must be >= the product's minimum price.
      product_cart: [{ product_id: dodo.productId, quantity: 1, amount: amount * 100 }],
      billing_currency: "INR",
      billing_address: { country: "IN" },
      minimal_address: true,
      allowed_payment_method_types: ["upi_intent", "credit", "debit"],
      return_url: `${returnBase}/?order_id=${orderId}`,
      metadata: { order_id: orderId, actor: actor.name },
    }),
  });

  if (!dRes.ok) {
    console.error("dodo create checkout failed", dRes.status, await dRes.text());
    await supabase.from("contributions").update({ status: "failed" }).eq("cashfree_order_id", orderId);
    return json(req, { error: "gateway_error" }, 502);
  }

  const session = await dRes.json();
  if (!session.session_id || !session.checkout_url) {
    console.error("dodo checkout response missing fields", JSON.stringify(session));
    await supabase.from("contributions").update({ status: "failed" }).eq("cashfree_order_id", orderId);
    return json(req, { error: "gateway_error" }, 502);
  }
  await supabase.from("contributions").update({ dodo_session_id: session.session_id }).eq("cashfree_order_id", orderId);

  return json(req, {
    order_id: orderId,
    checkout_url: session.checkout_url,
    environment: dodo.mode,
  });
});
