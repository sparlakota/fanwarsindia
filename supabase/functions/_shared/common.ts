// Shared by create-order, order-status, dodo-webhook and reconcile-pending.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const SITE_ORIGIN = "https://www.fanwarsindia.com";

const ALLOWED_ORIGINS = [
  "https://www.fanwarsindia.com",
  "https://fanwarsindia.com",
  "http://localhost:8791",
  "http://127.0.0.1:8791",
];

// Vercel preview deployments of THIS project only (team slug shab5), e.g. fanwarsindia-git-dodo-shab5.vercel.app
const PREVIEW_ORIGIN = /^https:\/\/fanwarsindia(-[a-z0-9-]+)?-shab5\.vercel\.app$/;

/** The public site. Test-mode payments are refused from here so they can't reach real fans. */
export function isProductionSite(origin: string): boolean {
  return origin === "https://www.fanwarsindia.com" || origin === "https://fanwarsindia.com";
}

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin);
}

/** Where Dodo may send the fan back to after checkout (https only). */
export function returnBaseFor(origin: string): string {
  return origin.startsWith("https://") && isAllowedOrigin(origin) ? origin : SITE_ORIGIN;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "7200", // browsers skip the preflight round trip for 2 h
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function db(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

export type DodoConfig = {
  apiKey: string;
  productId: string;
  mode: "test_mode" | "live_mode";
  base: string;
};

/** null until the DODO_API_KEY / DODO_PRODUCT_ID secrets are set in Supabase. */
export function dodoConfig(): DodoConfig | null {
  const apiKey = Deno.env.get("DODO_API_KEY");
  const productId = Deno.env.get("DODO_PRODUCT_ID");
  if (!apiKey || !productId) return null;
  const mode = Deno.env.get("DODO_ENV") === "live_mode" ? "live_mode" : "test_mode";
  return {
    apiKey,
    productId,
    mode,
    base: mode === "live_mode" ? "https://live.dodopayments.com" : "https://test.dodopayments.com",
  };
}

export function dodoHeaders(d: DodoConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${d.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// A Dodo checkout link stays valid for 24 h, so a payment can land long after the fan "failed" out.
const SESSION_LIFETIME_MS = 24 * 3600_000;
const ABANDON_AFTER_MS = SESSION_LIFETIME_MS + 60 * 60_000; // no payment attempt by then -> failed
const LATE_PAYMENT_WINDOW_MS = ABANDON_AFTER_MS + 60 * 60_000; // keep checking 'failed' rows this long

/**
 * Ask Dodo (server-to-server) what actually happened to a checkout and record it.
 * This is the ONLY place a contribution becomes 'success' — never the browser, and not the
 * webhook payload itself (the webhook just triggers this re-check).
 * Idempotent: a 'success' row is never touched again. A 'failed' row can still turn 'success'
 * if Dodo later reports the payment as succeeded (the fan retried within the same checkout).
 */
export async function syncOrder(supabase: SupabaseClient, dodo: DodoConfig, orderId: string) {
  const { data: row, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("cashfree_order_id", orderId) // column name predates Dodo: it holds OUR order reference (fw_…)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.status === "success" || !row.dodo_session_id) return row;

  const age = Date.now() - Date.parse(row.created_at);
  if (row.status === "failed" && age > LATE_PAYMENT_WINDOW_MS) return row;

  const sres = await fetch(`${dodo.base}/checkouts/${encodeURIComponent(row.dodo_session_id)}`, {
    headers: dodoHeaders(dodo),
  });
  if (!sres.ok) {
    console.error("dodo get checkout failed", orderId, sres.status, await sres.text());
    return row;
  }
  const session = await sres.json();
  const paymentId: string | null = session.payment_id ?? null;

  let status: "success" | "failed" | null = null;
  let confirmedPaymentId: string | null = null;

  if (!paymentId) {
    // Nobody has attempted to pay. Once the checkout link has expired, the order is dead.
    if (row.status === "pending" && age > ABANDON_AFTER_MS) status = "failed";
  } else {
    const pres = await fetch(`${dodo.base}/payments/${encodeURIComponent(paymentId)}`, { headers: dodoHeaders(dodo) });
    if (!pres.ok) {
      console.error("dodo get payment failed", orderId, paymentId, pres.status, await pres.text());
      return row;
    }
    const payment = await pres.json();
    if (payment.status === "succeeded") {
      if (payment.currency !== "INR" || Number(payment.total_amount) !== row.amount * 100) {
        console.error("amount mismatch", orderId, payment.currency, payment.total_amount, row.amount);
        return row;
      }
      status = "success";
      confirmedPaymentId = paymentId;
    } else if ((payment.status === "failed" || payment.status === "cancelled") && row.status === "pending") {
      status = "failed";
    }
  }
  if (!status) return row;

  const update: Record<string, unknown> = { status };
  if (status === "success") {
    update.confirmed_at = new Date().toISOString();
    update.dodo_payment_id = confirmedPaymentId;
  }

  const { data: updated, error: upErr } = await supabase
    .from("contributions")
    .update(update)
    .eq("id", row.id)
    .neq("status", "success")
    .select()
    .maybeSingle();
  if (upErr) throw upErr;
  if (updated) return updated;

  const { data: latest } = await supabase.from("contributions").select("*").eq("id", row.id).maybeSingle();
  return latest;
}
