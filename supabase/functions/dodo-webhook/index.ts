// Dodo -> us, server to server (Standard Webhooks). The signature proves the call came from Dodo;
// even then we don't trust the payload's status: we re-check the payment with Dodo (syncOrder).
import { db, dodoConfig, dodoHeaders, syncOrder } from "../_shared/common.ts";

const TOLERANCE_SECONDS = 5 * 60;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function expectedSignature(id: string, timestamp: string, rawBody: string, secret: string): Promise<string> {
  const keyBytes = b64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const dodo = dodoConfig();
  const secret = Deno.env.get("DODO_WEBHOOK_KEY");
  if (!dodo || !secret) return new Response("payments not configured", { status: 503 });

  const rawBody = await req.text();
  const id = req.headers.get("webhook-id") ?? "";
  const timestamp = req.headers.get("webhook-timestamp") ?? "";
  const header = req.headers.get("webhook-signature") ?? "";
  if (!id || !timestamp || !header) return new Response("invalid signature", { status: 401 });
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) {
    return new Response("stale timestamp", { status: 401 });
  }

  let expected: string;
  try {
    expected = await expectedSignature(id, timestamp, rawBody, secret);
  } catch (e) {
    console.error("webhook secret unusable", e);
    return new Response("misconfigured", { status: 500 });
  }
  const valid = header.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    return version === "v1" && !!sig && safeEqual(sig, expected);
  });
  if (!valid) return new Response("invalid signature", { status: 401 });

  let payload: { type?: string; data?: { payment_id?: string; metadata?: Record<string, string> } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("ok", { status: 200 });
  }
  if (!payload.type?.startsWith("payment.")) return new Response("ok", { status: 200 });

  const supabase = db();
  try {
    let orderId = payload.data?.metadata?.order_id;
    if (!orderId?.startsWith("fw_")) {
      // Fall back to asking Dodo which checkout this payment belongs to.
      const paymentId = payload.data?.payment_id;
      if (!paymentId) return new Response("ok", { status: 200 });
      const pres = await fetch(`${dodo.base}/payments/${encodeURIComponent(paymentId)}`, { headers: dodoHeaders(dodo) });
      if (!pres.ok) return new Response("retry", { status: 500 });
      const payment = await pres.json();
      orderId = payment.metadata?.order_id;
      if (!orderId?.startsWith("fw_") && payment.checkout_session_id) {
        const { data: found } = await supabase
          .from("contributions")
          .select("cashfree_order_id")
          .eq("dodo_session_id", payment.checkout_session_id)
          .maybeSingle();
        orderId = found?.cashfree_order_id;
      }
    }
    if (!orderId || !orderId.startsWith("fw_")) return new Response("ok", { status: 200 });
    await syncOrder(supabase, dodo, orderId);
  } catch (e) {
    console.error("webhook sync failed", e);
    return new Response("retry", { status: 500 }); // Dodo retries non-2xx
  }
  return new Response("ok", { status: 200 });
});
