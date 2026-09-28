// Safety net, run by pg_cron every 10 minutes. Re-checks unconfirmed payments with Cashfree so a
// fan who paid is never left uncounted just because both the webhook and their browser dropped out.
// Orders expire at Cashfree after 1 hour (see create-order), so abandoned checkouts end up 'failed'.
// Auth: x-reconcile-token must match the Vault secret 'reconcile_token' (only the cron job has it).
import { cashfreeConfig, db, syncOrder } from "../_shared/common.ts";

const MAX_PER_RUN = 100;
const LOOKBACK_HOURS = 48;
const GRACE_MINUTES = 2; // leave checkouts that are still in progress to the webhook/browser

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const supabase = db();
  const token = req.headers.get("x-reconcile-token") ?? "";
  const { data: ok } = await supabase.rpc("reconcile_token_ok", { p_token: token });
  if (ok !== true) return new Response("unauthorized", { status: 401 });

  const cf = cashfreeConfig();
  if (!cf) return Response.json({ skipped: "payments_not_configured" });

  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();
  const until = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();
  const { data: rows, error } = await supabase
    .from("contributions")
    .select("cashfree_order_id")
    .eq("status", "pending")
    .gte("created_at", since)
    .lte("created_at", until)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) {
    console.error("reconcile query failed", error);
    return new Response("db error", { status: 500 });
  }

  const result = { checked: 0, success: 0, failed: 0, still_pending: 0, errors: 0 };
  for (const r of rows ?? []) {
    result.checked++;
    try {
      const after = await syncOrder(supabase, cf, r.cashfree_order_id);
      if (after?.status === "success") result.success++;
      else if (after?.status === "failed") result.failed++;
      else result.still_pending++;
    } catch (e) {
      result.errors++;
      console.error("reconcile failed", r.cashfree_order_id, e);
    }
  }
  if (result.success || result.errors) console.log("reconcile", JSON.stringify(result));
  return Response.json(result);
});
