// Safety net, run by pg_cron every 10 minutes. Re-checks unconfirmed payments with Dodo so a
// fan who paid is never left uncounted just because both the webhook and their browser dropped out.
// A checkout link lives 24 h; rows with no payment attempt after that become 'failed' (see syncOrder),
// and 'failed' rows are re-checked for a while in case the fan paid late through the same link.
// Auth: x-reconcile-token must match the Vault secret 'reconcile_token' (only the cron job has it).
import { db, dodoConfig, syncOrder } from "../_shared/common.ts";

const MAX_PER_RUN = 100;
const PENDING_LOOKBACK_HOURS = 48;
const FAILED_LOOKBACK_HOURS = 26;
const GRACE_MINUTES = 2; // leave checkouts that are still in progress to the webhook/browser

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const supabase = db();
  const token = req.headers.get("x-reconcile-token") ?? "";
  const { data: ok } = await supabase.rpc("reconcile_token_ok", { p_token: token });
  if (ok !== true) return new Response("unauthorized", { status: 401 });

  const dodo = dodoConfig();
  if (!dodo) return Response.json({ skipped: "payments_not_configured" });

  const until = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();
  const query = (status: string, hours: number) =>
    supabase
      .from("contributions")
      .select("order_ref")
      .eq("status", status)
      .not("dodo_session_id", "is", null)
      .gte("created_at", new Date(Date.now() - hours * 3600_000).toISOString())
      .lte("created_at", until)
      .order("created_at", { ascending: true })
      .limit(MAX_PER_RUN);

  const [pending, failed] = await Promise.all([
    query("pending", PENDING_LOOKBACK_HOURS),
    query("failed", FAILED_LOOKBACK_HOURS),
  ]);
  if (pending.error || failed.error) {
    console.error("reconcile query failed", pending.error ?? failed.error);
    return new Response("db error", { status: 500 });
  }
  const rows = [...(pending.data ?? []), ...(failed.data ?? [])].slice(0, MAX_PER_RUN);

  const result = { checked: 0, success: 0, failed: 0, still_pending: 0, errors: 0 };
  for (const r of rows) {
    result.checked++;
    try {
      const after = await syncOrder(supabase, dodo, r.order_ref);
      if (after?.status === "success") result.success++;
      else if (after?.status === "failed") result.failed++;
      else result.still_pending++;
    } catch (e) {
      result.errors++;
      console.error("reconcile failed", r.order_ref, e);
    }
  }
  if (result.success || result.errors) console.log("reconcile", JSON.stringify(result));
  return Response.json(result);
});
