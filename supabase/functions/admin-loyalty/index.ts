import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

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

    const canManage = session.type === "master" || hasMinRole(session.role, "manager");

    if (!action || action === "list") {
      const [{ data: rewards }, { data: tiers }, { data: redemptions }, { data: winery }] = await Promise.all([
        supabase.from("loyalty_rewards").select("*").eq("winery_id", winery_id).order("threshold"),
        supabase.from("loyalty_tiers").select("*").eq("winery_id", winery_id).order("position"),
        supabase.from("loyalty_redemptions").select("*").eq("winery_id", winery_id).order("created_at", { ascending: false }).limit(200),
        supabase.from("wineries").select("loyalty_rules").eq("id", winery_id).single(),
      ]);
      const userIds = Array.from(new Set((redemptions ?? []).map((r: any) => r.user_id)));
      const { data: users } = userIds.length
        ? await supabase.from("users_leads").select("id, name, whatsapp, loyalty_points").in("id", userIds)
        : { data: [] } as any;
      const uMap: any = {}; for (const u of users ?? []) uMap[u.id] = u;
      const rMap: any = {}; for (const r of rewards ?? []) rMap[r.id] = r;
      const enriched = (redemptions ?? []).map((r: any) => ({
        ...r,
        user_name: uMap[r.user_id]?.name,
        user_whatsapp: uMap[r.user_id]?.whatsapp,
        reward_title: rMap[r.reward_id]?.title,
      }));
      return json({ success: true, rewards: rewards ?? [], tiers: tiers ?? [], redemptions: enriched, rules: winery?.loyalty_rules ?? {} });
    }

    if (action === "upsert_reward") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id, title, description, threshold, points_cost, image_url, category, active } = body;
      const payload: any = { winery_id, title, description, threshold: threshold ?? 0, points_cost: points_cost ?? 0, image_url, category, active: active ?? true };
      if (id) {
        const { error } = await supabase.from("loyalty_rewards").update(payload).eq("id", id).eq("winery_id", winery_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("loyalty_rewards").insert(payload);
        if (error) throw error;
      }
      return json({ success: true });
    }

    if (action === "delete_reward") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id } = body;
      const { error } = await supabase.from("loyalty_rewards").delete().eq("id", id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "upsert_tier") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id, name, min_points, perks, color, position } = body;
      const payload: any = { winery_id, name, min_points: min_points ?? 0, perks: perks ?? [], color: color ?? "#9CA3AF", position: position ?? 0 };
      if (id) {
        const { error } = await supabase.from("loyalty_tiers").update(payload).eq("id", id).eq("winery_id", winery_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("loyalty_tiers").insert(payload);
        if (error) throw error;
      }
      return json({ success: true });
    }

    if (action === "delete_tier") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id } = body;
      const { error } = await supabase.from("loyalty_tiers").delete().eq("id", id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "update_rules") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { rules } = body;
      const { error } = await supabase.from("wineries").update({ loyalty_rules: rules }).eq("id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "approve_redemption") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id, status } = body; // status: 'aprovado' | 'recusado' | 'entregue'
      const { error } = await supabase.from("loyalty_redemptions").update({
        status, approved_by: session.sub,
        redeemed_at: status === "entregue" ? new Date().toISOString() : null,
      }).eq("id", id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "request_redemption") {
      const { user_id, reward_id } = body;
      const { data: reward } = await supabase.from("loyalty_rewards").select("*").eq("id", reward_id).single();
      const { data: user } = await supabase.from("users_leads").select("loyalty_points").eq("id", user_id).single();
      if (!reward || !user) return json({ error: "Dados inválidos" }, 404);
      const cost = reward.points_cost ?? reward.threshold ?? 0;
      if ((user.loyalty_points ?? 0) < cost) return json({ error: "Pontos insuficientes" }, 400);
      await supabase.from("loyalty_redemptions").insert({
        winery_id: reward.winery_id, user_id, reward_id, points_spent: cost,
      });
      await supabase.from("users_leads").update({ loyalty_points: (user.loyalty_points ?? 0) - cost }).eq("id", user_id);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-loyalty error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
