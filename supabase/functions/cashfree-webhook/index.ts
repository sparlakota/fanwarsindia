// Cashfree -> us, server to server. The signature proves the call came from Cashfree;
// even then we don't trust the payload's status, we re-check the order with Cashfree (syncOrder).
import { cashfreeConfig, db, syncOrder } from "../_shared/common.ts";

async function expectedSignature(timestamp: string, rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + rawBody));
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

  const cf = cashfreeConfig();
  if (!cf) return new Response("payments not configured", { status: 503 });

  const rawBody = await req.text();
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const signature = req.headers.get("x-webhook-signature") ?? "";
  if (!timestamp || !signature || !safeEqual(signature, await expectedSignature(timestamp, rawBody, cf.secret))) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: { data?: { order?: { order_id?: string } } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("ok", { status: 200 });
  }

  const orderId = payload?.data?.order?.order_id;
  if (!orderId || !orderId.startsWith("fw_")) return new Response("ok", { status: 200 });

  try {
    await syncOrder(db(), cf, orderId);
  } catch (e) {
    console.error("webhook sync failed", orderId, e);
    return new Response("retry", { status: 500 }); // Cashfree retries non-2xx
  }
  return new Response("ok", { status: 200 });
});
