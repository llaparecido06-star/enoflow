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

    const canRespond = session.type === "master" || hasMinRole(session.role, "manager");

    // ─── LIST WINE REVIEWS ───
    if (!action || action === "list_wine_reviews") {
      const { wine_id, has_response } = body;
      let q = supabase.from("wine_reviews").select("*").eq("winery_id", winery_id);
      if (wine_id) q = q.eq("wine_id", wine_id);
      if (has_response === false) q = q.is("public_response", null);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(500);
      if (error) throw error;

      const wineIds = Array.from(new Set((data ?? []).map((r: any) => r.wine_id)));
      const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean)));
      const [{ data: wines }, { data: users }] = await Promise.all([
        wineIds.length ? supabase.from("wines").select("id, name, image_url").in("id", wineIds) : Promise.resolve({ data: [] }),
        userIds.length ? supabase.from("users_leads").select("id, name").in("id", userIds) : Promise.resolve({ data: [] }),
      ]);
      const wineMap: any = {}; for (const w of wines ?? []) wineMap[w.id] = w;
      const userMap: any = {}; for (const u of users ?? []) userMap[u.id] = u;
      const reviews = (data ?? []).map((r: any) => ({
        ...r,
        wine_name: wineMap[r.wine_id]?.name,
        wine_image: wineMap[r.wine_id]?.image_url,
        user_name: userMap[r.user_id]?.name,
      }));
      return json({ success: true, reviews });
    }

    // ─── WINE AGG ───
    if (action === "wine_summary") {
      const { data, error } = await supabase.from("wine_reviews").select("wine_id, stars").eq("winery_id", winery_id);
      if (error) throw error;
      const byWine: Record<string, { sum: number; count: number }> = {};
      for (const r of data ?? []) {
        const w = byWine[r.wine_id] ?? (byWine[r.wine_id] = { sum: 0, count: 0 });
        w.sum += r.stars; w.count++;
      }
      const wineIds = Object.keys(byWine);
      const { data: wines } = wineIds.length
        ? await supabase.from("wines").select("id, name, image_url").in("id", wineIds)
        : { data: [] } as any;
      const summary = (wines ?? []).map((w: any) => ({
        wine_id: w.id, name: w.name, image_url: w.image_url,
        avg: +(byWine[w.id].sum / byWine[w.id].count).toFixed(2),
        count: byWine[w.id].count,
      })).sort((a: any, b: any) => b.count - a.count);
      return json({ success: true, summary });
    }

    // ─── RESPOND ───
    if (action === "respond") {
      if (!canRespond) return json({ error: "Permissão insuficiente" }, 403);
      const { review_id, response } = body;
      if (!review_id || !response) return json({ error: "review_id e response obrigatórios" }, 400);
      const { error } = await supabase.from("wine_reviews")
        .update({ public_response: response, responded_by: session.sub, responded_at: new Date().toISOString() })
        .eq("id", review_id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── NPS SUMMARY ───
    if (action === "nps_summary") {
      const { data: vouchers } = await supabase.from("vouchers").select("id, nps_score, created_at").eq("winery_id", winery_id).not("nps_score", "is", null);
      const scores = (vouchers ?? []).map((v: any) => v.nps_score);
      const promoters = scores.filter((s: number) => s >= 9).length;
      const detractors = scores.filter((s: number) => s <= 6).length;
      const passives = scores.length - promoters - detractors;
      const nps = scores.length ? Math.round(((promoters - detractors) / scores.length) * 100) : 0;

      const { data: responses } = await supabase.from("nps_responses").select("*").eq("winery_id", winery_id).order("created_at", { ascending: false }).limit(100);

      return json({ success: true, nps, total: scores.length, promoters, passives, detractors, responses: responses ?? [] });
    }

    // ─── SUBMIT NPS COMMENT (tourist) ───
    if (action === "submit_nps_response") {
      const { voucher_id, score, comment } = body;
      const { data: v } = await supabase.from("vouchers").select("winery_id, user_id").eq("id", voucher_id).single();
      if (!v) return json({ error: "voucher não encontrado" }, 404);
      await supabase.from("nps_responses").insert({ winery_id: v.winery_id, voucher_id, user_id: v.user_id, score, comment });
      if (typeof score === "number") {
        await supabase.from("vouchers").update({ nps_score: score }).eq("id", voucher_id);
      }
      return json({ success: true });
    }

    // ─── SUBMIT WINE REVIEW (tourist) ───
    if (action === "submit_wine_review") {
      const { wine_id, stars, comment, user_id } = body;
      if (!wine_id || !stars) return json({ error: "wine_id e stars obrigatórios" }, 400);
      const { data: w } = await supabase.from("wines").select("winery_id").eq("id", wine_id).single();
      if (!w) return json({ error: "vinho não encontrado" }, 404);
      await supabase.from("wine_reviews").insert({ winery_id: w.winery_id, wine_id, stars, comment, user_id });
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-reviews error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
