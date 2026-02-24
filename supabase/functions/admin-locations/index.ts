import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function verifySession(req: Request) {
  try {
    const token = req.headers.get("x-session-token");
    if (!token) return null;
    const [hB64, pB64, sB64] = token.split(".");
    if (!hB64 || !pB64 || !sB64) return null;
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(atob(sB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(`${hB64}.${pB64}`));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(pB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0))));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload as { sub: string; winery_id: string; role: string; type: string };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.type !== "admin") return json({ error: "Não autorizado" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action } = body;
    const winery_id = session.winery_id;

    // Only owner/manager can manage locations
    if (!["owner", "dono", "manager", "gerente", "master"].includes(session.role)) {
      return json({ error: "Permissão insuficiente" }, 403);
    }

    // ─── LIST ────────────────────────────────────────────
    if (!action || action === "list") {
      const [locsRes, wineryRes] = await Promise.all([
        supabase.from("capture_points").select("*").eq("winery_id", winery_id).order("created_at", { ascending: true }),
        supabase.from("wineries").select("max_locations, slug").eq("id", winery_id).single(),
      ]);
      if (locsRes.error) throw locsRes.error;
      return json({
        success: true,
        locations: locsRes.data ?? [],
        max_locations: wineryRes.data?.max_locations ?? 5,
        slug: wineryRes.data?.slug ?? "",
      });
    }

    // ─── CREATE ──────────────────────────────────────────
    if (action === "create") {
      const { name, category, redirect_url } = body;
      if (!name) return json({ error: "Nome obrigatório" }, 400);

      // Check limit
      const { count } = await supabase.from("capture_points").select("id", { count: "exact", head: true }).eq("winery_id", winery_id);
      const { data: winery } = await supabase.from("wineries").select("max_locations").eq("id", winery_id).single();
      const max = winery?.max_locations ?? 5;
      if ((count ?? 0) >= max) return json({ error: `Limite de ${max} locais atingido. Atualize seu plano.` }, 403);

      const validCategories = ["restaurant", "tasting", "shop", "wifi", "other"];
      const { data, error } = await supabase.from("capture_points").insert({
        winery_id,
        name: String(name).slice(0, 100),
        category: validCategories.includes(category) ? category : "restaurant",
        redirect_url: redirect_url ? String(redirect_url).slice(0, 500) : null,
      }).select().single();
      if (error) throw error;
      return json({ success: true, location: data });
    }

    // ─── UPDATE ──────────────────────────────────────────
    if (action === "update") {
      const { location_id, name, category, redirect_url } = body;
      if (!location_id) return json({ error: "location_id obrigatório" }, 400);

      const updates: Record<string, unknown> = {};
      if (name) updates.name = String(name).slice(0, 100);
      if (category) {
        const validCategories = ["restaurant", "tasting", "shop", "wifi", "other"];
        if (validCategories.includes(category)) updates.category = category;
      }
      if (redirect_url !== undefined) updates.redirect_url = redirect_url ? String(redirect_url).slice(0, 500) : null;

      if (Object.keys(updates).length === 0) return json({ error: "Nada para atualizar" }, 400);

      const { error } = await supabase.from("capture_points").update(updates).eq("id", location_id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── DELETE ──────────────────────────────────────────
    if (action === "delete") {
      const { location_id } = body;
      if (!location_id) return json({ error: "location_id obrigatório" }, 400);
      const { error } = await supabase.from("capture_points").delete().eq("id", location_id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("admin-locations error:", err);
    return json({ error: "Erro interno" }, 500);
  }
});
