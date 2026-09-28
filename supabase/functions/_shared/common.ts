// Shared by create-order, order-status and cashfree-webhook.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const SITE_ORIGIN = "https://www.fanwarsindia.com";

const ALLOWED_ORIGINS = [
  "https://www.fanwarsindia.com",
  "https://fanwarsindia.com",
  "http://localhost:8791",
  "http://127.0.0.1:8791",
];

// Vercel preview deployments of THIS project only (team slug shab5), e.g. fanwarsindia-git-payments-shab5.vercel.app
const PREVIEW_ORIGIN = /^https:\/\/fanwarsindia(-[a-z0-9-]+)?-shab5\.vercel\.app$/;

export function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin);
}

/** Where Cashfree may send the fan back to after a redirect-based payment (https only). */
export function returnBaseFor(origin: string): string {
  return origin.startsWith("https://") && isAllowedOrigin(origin) ? origin : SITE_ORIGIN;
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : SITE_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
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

export type CashfreeConfig = { appId: string; secret: string; env: "sandbox" | "production"; base: string };

/** null until the CASHFREE_APP_ID / CASHFREE_SECRET_KEY secrets are set in Supabase. */
export function cashfreeConfig(): CashfreeConfig | null {
  const appId = Deno.env.get("CASHFREE_APP_ID");
  const secret = Deno.env.get("CASHFREE_SECRET_KEY");
  if (!appId || !secret) return null;
  const env = Deno.env.get("CASHFREE_ENV") === "production" ? "production" : "sandbox";
  return {
    appId,
    secret,
    env,
    base: env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
  };
}

export function cashfreeHeaders(cf: CashfreeConfig): Record<string, string> {
  return {
    "x-client-id": cf.appId,
    "x-client-secret": cf.secret,
    "x-api-version": Deno.env.get("CASHFREE_API_VERSION") ?? "2023-08-01",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Ask Cashfree (server-to-server) what actually happened to an order and record it.
 * This is the ONLY place a contribution becomes 'success' — never the browser, and
 * not the webhook payload itself (the webhook just triggers this re-check).
 * Idempotent: only a still-pending row is ever updated.
 */
export async function syncOrder(supabase: SupabaseClient, cf: CashfreeConfig, orderId: string) {
  const { data: row, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("cashfree_order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!row || row.status !== "pending") return row;

  const res = await fetch(`${cf.base}/orders/${encodeURIComponent(orderId)}`, { headers: cashfreeHeaders(cf) });
  if (!res.ok) {
    console.error("cashfree get order failed", orderId, res.status, await res.text());
    return row;
  }
  const order = await res.json();

  let status: "success" | "failed" | null = null;
  if (order.order_status === "PAID") {
    if (Math.round(Number(order.order_amount)) !== row.amount) {
      console.error("amount mismatch", orderId, order.order_amount, row.amount);
      return row;
    }
    status = "success";
  } else if (order.order_status === "EXPIRED" || order.order_status === "TERMINATED") {
    status = "failed";
  }
  if (!status) return row;

  const update: Record<string, unknown> = { status };
  if (status === "success") {
    update.confirmed_at = new Date().toISOString();
    try {
      const pres = await fetch(`${cf.base}/orders/${encodeURIComponent(orderId)}/payments`, {
        headers: cashfreeHeaders(cf),
      });
      if (pres.ok) {
        const payments = await pres.json();
        const paid = Array.isArray(payments) ? payments.find((p) => p.payment_status === "SUCCESS") : null;
        if (paid) update.cf_payment_id = String(paid.cf_payment_id);
      }
    } catch (_) {
      /* payment id is nice-to-have; the order is already confirmed PAID */
    }
  }

  const { data: updated, error: upErr } = await supabase
    .from("contributions")
    .update(update)
    .eq("id", row.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (upErr) throw upErr;
  if (updated) return updated;

  const { data: latest } = await supabase.from("contributions").select("*").eq("id", row.id).maybeSingle();
  return latest;
}
