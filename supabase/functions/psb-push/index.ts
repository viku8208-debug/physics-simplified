import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { send as sendWebPush } from "jsr:@daaku/webpush@0.2.0";

type PushConfig = {
  vapidPrivateJwk: JsonWebKey;
  dispatchSecret: string;
  contact: string;
};

type StoredSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  (() => {
    try {
      return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
    } catch {
      return undefined;
    }
  })();

const allowedOrigins = new Set([
  "https://physicsbysurajbhardwaj.in",
  "https://www.physicsbysurajbhardwaj.in",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://physicsbysurajbhardwaj.in",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

if (!PROJECT_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase server credentials.");
}

const admin = createClient(PROJECT_URL, SERVICE_ROLE_KEY ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getPushConfig(): Promise<PushConfig> {
  const { data, error } = await admin.rpc("get_psb_push_config");
  if (error) throw new Error("Push configuration is unavailable.");
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.dispatchSecret !== "string" ||
    !data.vapidPrivateJwk
  ) {
    throw new Error("Push configuration is incomplete.");
  }
  return data as PushConfig;
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed." }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(req, { error: "Invalid request body." }, 400);
    }
  } catch {
    return jsonResponse(req, { error: "Invalid JSON body." }, 400);
  }

  const action = String(body.action ?? "");

  if (action === "dispatch") {
    let config: PushConfig;
    try {
      config = await getPushConfig();
    } catch (error) {
      console.error(error);
      return jsonResponse(req, { error: "Push sender is not configured." }, 503);
    }

    const suppliedSecret = req.headers.get("x-psb-hook-secret") ?? "";
    if (!secureEqual(suppliedSecret, config.dispatchSecret)) {
      return jsonResponse(req, { error: "Unauthorized." }, 401);
    }

    const title = String(body.title ?? "New update from Suraj Sir").slice(0, 100);
    const message = String(body.body ?? "Open the website to see what's new.").slice(0, 180);
    const url = String(body.url ?? "/");
    const safeUrl = url.startsWith("/") && !url.startsWith("//") ? url : "/";
    const tag = String(body.tag ?? "psb-updates").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "psb-updates";
    const creatorId = typeof body.creator_id === "string" ? body.creator_id : null;

    let query = admin
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .limit(500);

    if (creatorId) query = query.neq("user_id", creatorId);

    const { data: subscriptions, error } = await query;
    if (error) {
      console.error("Could not load push subscriptions:", error.message);
      return jsonResponse(req, { error: "Could not load subscriptions." }, 500);
    }

    const payload = JSON.stringify({
      title,
      body: message,
      url: safeUrl,
      tag,
    });

    let sent = 0;
    let failed = 0;
    let removed = 0;

    for (let offset = 0; offset < (subscriptions ?? []).length; offset += 40) {
      const batch = (subscriptions ?? []).slice(offset, offset + 40);
      const results = await Promise.allSettled(
        batch.map(async (row: StoredSubscription) => {
          try {
            await sendWebPush(
              {
                endpoint: row.endpoint,
                keys: { p256dh: row.p256dh, auth: row.auth },
              },
              payload,
              {
                vapid: config.vapidPrivateJwk,
                subscriber: config.contact,
                ttl: 3600,
                urgency: "normal",
              },
            );
            return "sent";
          } catch (error) {
            const pushError = error as { permanent?: boolean; statusCode?: number };
            if (
              pushError?.permanent ||
              pushError?.statusCode === 404 ||
              pushError?.statusCode === 410
            ) {
              const { error: deleteError } = await admin
                .from("push_subscriptions")
                .delete()
                .eq("id", row.id);
              if (!deleteError) return "removed";
            }
            console.error("Push delivery failed:", pushError?.statusCode ?? "unknown");
            throw error;
          }
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value === "sent") sent++;
        else if (result.status === "fulfilled" && result.value === "removed") removed++;
        else failed++;
      }
    }

    return jsonResponse(req, {
      ok: true,
      attempted: (subscriptions ?? []).length,
      sent,
      failed,
      removed,
    });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return jsonResponse(req, { error: "Please sign in to manage phone notifications." }, 401);
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";

  if (action === "status") {
    if (!endpoint.startsWith("https://")) {
      return jsonResponse(req, { enabled: false });
    }
    const { data, error } = await admin
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("endpoint", endpoint)
      .maybeSingle();
    if (error) {
      console.error("Push status lookup failed:", error.message);
      return jsonResponse(req, { error: "Could not check notification status." }, 500);
    }
    return jsonResponse(req, { enabled: !!data });
  }

  if (action === "subscribe") {
    const subscription = body.subscription as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    } | undefined;

    const subEndpoint = typeof subscription?.endpoint === "string"
      ? subscription.endpoint
      : "";
    const p256dh = typeof subscription?.keys?.p256dh === "string"
      ? subscription.keys.p256dh
      : "";
    const auth = typeof subscription?.keys?.auth === "string"
      ? subscription.keys.auth
      : "";

    if (
      !subEndpoint.startsWith("https://") ||
      p256dh.length < 40 ||
      p256dh.length > 300 ||
      auth.length < 16 ||
      auth.length > 200
    ) {
      return jsonResponse(req, { error: "Invalid push subscription." }, 400);
    }

    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subEndpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      console.error("Could not save push subscription:", error.message);
      return jsonResponse(req, { error: "Could not save this device's subscription." }, 500);
    }
    return jsonResponse(req, { ok: true, enabled: true });
  }

  if (action === "unsubscribe") {
    if (!endpoint.startsWith("https://")) {
      return jsonResponse(req, { error: "Invalid subscription endpoint." }, 400);
    }
    const { error } = await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);
    if (error) {
      console.error("Could not remove push subscription:", error.message);
      return jsonResponse(req, { error: "Could not turn off phone notifications." }, 500);
    }
    return jsonResponse(req, { ok: true, enabled: false });
  }

  return jsonResponse(req, { error: "Unknown action." }, 400);
});
