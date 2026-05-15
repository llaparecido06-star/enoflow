import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";
import { logAudit } from "../_shared/audit.ts";

const WINERY_FIELDS = [
  "id", "name", "slug", "primary_color", "logo_url", "currency",
  "business_hours", "contact_phone", "contact_email", "address", "instagram_url",
  "google_business_url", "tripadvisor_url", "facebook_url", "youtube_url",
  "lgpd_policy_url", "default_language", "supported_languages",
  "plan_level", "status", "max_locations",
  "quiz_enabled", "quiz_config",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) return json({ error: "Não autorizado" }, 401);

    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const { action } = body;

    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) winery_id = body.winery_id;

    if (action === "get_config") {
      const { data, error } = await supabase.from("wineries").select(WINERY_FIELDS.join(", ")).eq("id", winery_id).single();
      if (error) throw error;
      return json({ success: true, winery: data });
    }

    if (action === "update_config") {
      // Owner+ only (manager cannot edit identity/currency)
      if (session.type !== "master" && !hasMinRole(session.role, "owner")) {
        return json({ error: "Apenas o dono pode alterar configurações" }, 403);
      }
      const { section, values } = body;
      if (!section || typeof values !== "object") return json({ error: "section e values obrigatórios" }, 400);

      const ALLOWED: Record<string, string[]> = {
        identity: ["name", "primary_color", "logo_url"],
        contact: ["contact_phone", "contact_email", "address", "instagram_url"],
        external: ["google_business_url", "tripadvisor_url", "facebook_url", "youtube_url"],
        hours: ["business_hours"],
        i18n: ["default_language", "supported_languages", "currency"],
        lgpd: ["lgpd_policy_url"],
        quiz: ["quiz_enabled", "quiz_config"],
      };
      const allowed = ALLOWED[section];
      if (!allowed) return json({ error: "section inválido" }, 400);

      const upd: any = { updated_at: new Date().toISOString() };
      for (const k of allowed) {
        if (k in values) upd[k] = values[k];
      }
      if (Object.keys(upd).length === 1) return json({ error: "Nada para atualizar" }, 400);

      const { data: before } = await supabase.from("wineries").select(allowed.join(", ")).eq("id", winery_id).single();
      const { data, error } = await supabase.from("wineries").update(upd).eq("id", winery_id).select(WINERY_FIELDS.join(", ")).single();
      if (error) throw error;
      await logAudit({ winery_id, admin_id: session.sub, admin_name: session.name, entity: "winery_config", entity_id: section, action: "update", before, after: upd });
      return json({ success: true, winery: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-winery-config error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
