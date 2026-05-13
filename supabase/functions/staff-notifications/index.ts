import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createSupabaseAdmin();
    const admin_id = session.sub;
    const winery_id = session.winery_id;

    const body = await req.json().catch(() => ({}));
    const { action, ids, status } = body;

    if (action === "list") {
      const { data, error } = await supabase
        .from("staff_notifications")
        .select("*")
        .eq("admin_id", admin_id)
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ success: true, notifications: data ?? [] });
    }

    if (action === "mark_seen") {
      const targetIds: string[] = Array.isArray(ids) ? ids.filter((s) => typeof s === "string").slice(0, 100) : [];
      if (!targetIds.length) return json({ success: true });
      const { error } = await supabase
        .from("staff_notifications")
        .update({ seen_at: new Date().toISOString() })
        .in("id", targetIds)
        .eq("admin_id", admin_id)
        .is("seen_at", null);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "set_status") {
      const targetIds: string[] = Array.isArray(ids) ? ids.filter((s) => typeof s === "string").slice(0, 100) : [];
      if (!targetIds.length) return json({ error: "ids required" }, 400);
      const allowed = ["pending", "seen", "done"];
      const newStatus = typeof status === "string" && allowed.includes(status) ? status : "done";
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === "done") { updates.done_at = new Date().toISOString(); updates.done_by = admin_id; }
      const { error } = await supabase
        .from("staff_notifications")
        .update(updates)
        .in("id", targetIds)
        .eq("admin_id", admin_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("staff-notifications error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
