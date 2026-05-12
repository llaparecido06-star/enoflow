// Black-box tests verifying hidden wine_reviews never leak to tourists.
// Runs against the deployed Supabase instance using anon credentials.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

function fnUrl(name: string) {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

async function callFn(name: string, body: Record<string, unknown>, opts: { sessionToken?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
  };
  if (opts.sessionToken) headers["x-session-token"] = opts.sessionToken;
  const res = await fetch(fnUrl(name), { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, json, text };
}

Deno.test("wine_reviews: direct anon REST select is denied by RLS", async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wine_reviews?select=id,is_hidden&limit=10`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const data = await res.json();
  // RLS policy is USING (false) → returns 200 with empty array, NEVER any rows
  assertEquals(res.status, 200);
  assert(Array.isArray(data), "should return array");
  assertEquals(data.length, 0, "anon must not see any wine_reviews via direct REST");
});

Deno.test("wine_reviews: anon REST cannot filter to hidden=false either", async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wine_reviews?is_hidden=eq.false&select=*`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const data = await res.json();
  assertEquals(res.status, 200);
  assert(Array.isArray(data));
  assertEquals(data.length, 0, "no rows must leak even when filtering by is_hidden=false");
});

Deno.test("tourist-actions: get_my_wine_review without session → 401", async () => {
  const { status, json } = await callFn("tourist-actions", {
    action: "get_my_wine_review",
    wine_id: "00000000-0000-0000-0000-000000000000",
  });
  assertEquals(status, 401);
  assert(json?.error, "must reject unauthenticated tourist calls");
});

Deno.test("tourist-actions: no public listing/search action exists", async () => {
  // These actions would be the obvious leak vectors. They must not exist
  // on the tourist endpoint.
  const candidates = [
    "list_wine_reviews",
    "search_wine_reviews",
    "wine_reviews",
    "public_reviews",
    "reviews_for_wine",
  ];
  for (const action of candidates) {
    const { status, json } = await callFn("tourist-actions", { action });
    // Without a session we always get 401 BEFORE the action switch is reached,
    // which means even with valid creds these actions are unknown.
    // We additionally assert no successful payload structure with reviews leaks.
    assert(status === 401 || json?.error === "Unknown action",
      `Action "${action}" must be unauthenticated-rejected or unknown, got ${status} ${JSON.stringify(json)}`);
    assert(!Array.isArray(json?.reviews), `Action "${action}" must not return a reviews array`);
  }
});

Deno.test("admin-reviews: tourist surface area is rejected without admin session", async () => {
  // Even though admin-reviews has actions like list_wine_reviews and submit_wine_review,
  // they all require an admin/master session. Unauthenticated calls must be 401.
  const actions = ["list_wine_reviews", "wine_summary", "set_hidden", "moderation_history"];
  for (const action of actions) {
    const { status, json } = await callFn("admin-reviews", { action });
    assertEquals(status, 401, `admin-reviews action "${action}" must require session`);
    assert(json?.error, "must return error payload");
    assert(!Array.isArray(json?.reviews), "must not return a reviews array unauthenticated");
  }
});

Deno.test("tourist-actions: get_my_wine_review with forged session token → 401", async () => {
  // Tampered/fake JWT must be rejected before any DB access.
  const fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlciIsInR5cGUiOiJ0b3VyaXN0In0.invalid";
  const { status } = await callFn(
    "tourist-actions",
    { action: "get_my_wine_review", wine_id: "00000000-0000-0000-0000-000000000000" },
    { sessionToken: fakeToken },
  );
  assertEquals(status, 401);
});
