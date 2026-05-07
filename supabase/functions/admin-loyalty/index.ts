import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) {
      return json({ error: "Não autorizado" }, 401);
    }
    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const winery_id = session.type === "master" && body.winery_id ? body.winery_id : session.winery_id;
    const { action } = body;

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, role, winery_id")
      .eq("id", session.sub)
      .single();
    if (!admin) return json({ error: "Não autorizado" }, 403);
    if (session.type === "admin" && admin.winery_id !== winery_id) return json({ error: "Não autorizado" }, 403);
    if (!hasMinRole(admin.role, "manager")) return json({ error: "Sem permissão" }, 403);

    if (action === "list") {
      const { data } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("winery_id", winery_id)
        .order("threshold");
      return json({ success: true, rewards: data ?? [] });
    }
    if (action === "upsert") {
      const { reward_id, threshold, title, description } = body;
      if (typeof threshold !== "number" || threshold < 1 || !title) return json({ error: "params" }, 400);
      const payload = {
        winery_id,
        threshold: Math.floor(threshold),
        title: String(title).slice(0, 120),
        description: description ? String(description).slice(0, 500) : null,
      };
      if (reward_id) {
        const { data, error } = await supabase
          .from("loyalty_rewards")
          .update(payload)
          .eq("id", reward_id)
          .eq("winery_id", winery_id)
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, reward: data });
      }
      const { data, error } = await supabase.from("loyalty_rewards").insert(payload).select().single();
      if (error) throw error;
      return json({ success: true, reward: data });
    }
    if (action === "delete") {
      const { reward_id } = body;
      if (!reward_id) return json({ error: "reward_id required" }, 400);
      await supabase.from("loyalty_rewards").delete().eq("id", reward_id).eq("winery_id", winery_id);
      return json({ success: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-loyalty error:", e);
    return json({ error: "An error occurred." }, 500);
  }
});
