import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.type !== "tourist") return json({ error: "Não autorizado" }, 401);

    const supabase = createSupabaseAdmin();
    const user_id = session.sub;
    const winery_id = session.winery_id;
    const body = await req.json();
    const { action } = body;

    // ─── Loyalty status: points + rewards + next milestone
    if (action === "loyalty_status") {
      const [userR, rewardsR, vouchersR] = await Promise.all([
        supabase.from("users_leads").select("loyalty_points, referred_by, referral_count").eq("id", user_id).maybeSingle(),
        supabase.from("loyalty_rewards").select("*").eq("winery_id", winery_id).order("threshold"),
        supabase.from("vouchers").select("id, redeemed").eq("user_id", user_id).eq("winery_id", winery_id),
      ]);
      const points = userR.data?.loyalty_points ?? 0;
      const rewards = rewardsR.data ?? [];
      const next = rewards.find((r: any) => r.threshold > points) ?? null;
      return json({
        success: true,
        points,
        rewards,
        next_reward: next,
        voucher_count: (vouchersR.data ?? []).length,
        redeemed_count: (vouchersR.data ?? []).filter((v: any) => v.redeemed).length,
        referral_count: userR.data?.referral_count ?? 0,
      });
    }

    // ─── Apply referral on first voucher (called by tourist after login if ?ref=)
    if (action === "set_referrer") {
      const { referrer_id } = body;
      if (!referrer_id || referrer_id === user_id) return json({ success: true });
      const { data: u } = await supabase.from("users_leads").select("referred_by").eq("id", user_id).maybeSingle();
      if (u?.referred_by) return json({ success: true }); // already set
      // verify referrer exists in same winery
      const { data: ref } = await supabase
        .from("users_leads")
        .select("id")
        .eq("id", referrer_id)
        .eq("winery_id", winery_id)
        .maybeSingle();
      if (!ref) return json({ success: true });
      await supabase.from("users_leads").update({ referred_by: referrer_id }).eq("id", user_id);
      return json({ success: true });
    }

    // ─── Award points (called after voucher generation)
    if (action === "award_voucher_points") {
      // +1 point for the user
      const { data: u } = await supabase
        .from("users_leads")
        .select("loyalty_points, referred_by, referral_count")
        .eq("id", user_id)
        .maybeSingle();
      const newPts = (u?.loyalty_points ?? 0) + 1;
      await supabase.from("users_leads").update({ loyalty_points: newPts }).eq("id", user_id);
      // First voucher → reward referrer too
      if (newPts === 1 && u?.referred_by) {
        const { data: r } = await supabase
          .from("users_leads")
          .select("loyalty_points, referral_count")
          .eq("id", u.referred_by)
          .maybeSingle();
        if (r) {
          await supabase
            .from("users_leads")
            .update({
              loyalty_points: (r.loyalty_points ?? 0) + 1,
              referral_count: (r.referral_count ?? 0) + 1,
            })
            .eq("id", u.referred_by);
        }
      }
      return json({ success: true, points: newPts });
    }

    // ─── AI recommendations
    if (action === "recommend") {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return json({ success: true, recommendations: [] });

      const [userR, ratingsR, favoritesR, winesR, vouchersR] = await Promise.all([
        supabase.from("users_leads").select("preferences_summary, gender, birth_date").eq("id", user_id).maybeSingle(),
        supabase.from("ratings").select("wine_id, stars_acidity, stars_body, stars_sweetness").eq("user_id", user_id),
        supabase.from("favorites").select("wine_id").eq("user_id", user_id).eq("winery_id", winery_id),
        supabase.from("wines").select("id, name, type, grape, sensory_acidity, sensory_body, sensory_sweetness, description, price_bottle, image_url").eq("winery_id", winery_id).eq("on_shop", true),
        supabase.from("vouchers").select("items").eq("user_id", user_id).eq("winery_id", winery_id),
      ]);

      const ratedIds = new Set((ratingsR.data ?? []).map((r: any) => r.wine_id));
      const favIds = new Set((favoritesR.data ?? []).map((f: any) => f.wine_id));
      const purchasedIds = new Set<string>();
      for (const v of vouchersR.data ?? []) {
        for (const it of (v.items as any[]) ?? []) {
          const id = it?.wine_id || it?.id;
          if (id) purchasedIds.add(id);
        }
      }
      const candidates = (winesR.data ?? []).filter((w: any) => !ratedIds.has(w.id) && !favIds.has(w.id) && !purchasedIds.has(w.id));
      if (candidates.length === 0) return json({ success: true, recommendations: [] });

      const persona = userR.data?.preferences_summary || "Sem persona definida";
      const ratedSummary = (ratingsR.data ?? []).slice(0, 5).map((r: any) => `acidez:${r.stars_acidity}, corpo:${r.stars_body}, doçura:${r.stars_sweetness}`).join("; ");
      const wineList = candidates.slice(0, 30).map((w: any) =>
        `${w.id}|${w.name}|${w.type}|${w.grape ?? "-"}|acidez:${w.sensory_acidity},corpo:${w.sensory_body},doçura:${w.sensory_sweetness}`
      ).join("\n");

      const prompt = `Você é um sommelier. Persona do turista: ${persona}. Avaliações típicas: ${ratedSummary}.
Vinhos disponíveis (id|nome|tipo|uva|sensorial):
${wineList}

Escolha os 3 vinhos mais alinhados ao paladar dele. Para cada um, escreva uma justificativa curta (máx 12 palavras) em português.
Responda APENAS com JSON: {"recommendations":[{"wine_id":"...","reason":"..."}]}`;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          }),
        });
        if (!aiRes.ok) return json({ success: true, recommendations: [] });
        const aiData = await aiRes.json();
        const content = aiData?.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(content);
        const recs = (parsed.recommendations ?? []).slice(0, 3);
        // attach wine details
        const out = recs
          .map((r: any) => {
            const w = candidates.find((c: any) => c.id === r.wine_id);
            return w ? { wine: w, reason: String(r.reason ?? "").slice(0, 200) } : null;
          })
          .filter(Boolean);
        return json({ success: true, recommendations: out });
      } catch {
        return json({ success: true, recommendations: [] });
      }
    }

    // ─── AI food pairings for a specific wine
    if (action === "pair_wine") {
      const { wine_id } = body;
      if (!wine_id) return json({ error: "wine_id required" }, 400);
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return json({ success: true, pairings: [] });

      const { data: wine } = await supabase
        .from("wines")
        .select("id, name, type, grape, sensory_acidity, sensory_body, sensory_sweetness, description")
        .eq("id", wine_id)
        .eq("winery_id", winery_id)
        .maybeSingle();
      if (!wine) return json({ success: true, pairings: [] });

      const prompt = `Você é um sommelier brasileiro. Para o vinho abaixo, sugira 3 harmonizações gastronômicas elegantes e específicas (pratos, queijos ou sobremesas).
Vinho: ${wine.name} (${wine.type}, uva ${wine.grape ?? "-"}). Acidez ${wine.sensory_acidity}/5, Corpo ${wine.sensory_body}/5, Doçura ${wine.sensory_sweetness}/5.
${wine.description ? `Notas: ${wine.description}` : ""}

Responda APENAS com JSON: {"pairings":[{"dish":"nome do prato","reason":"por que harmoniza (máx 18 palavras)"}]}`;

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          }),
        });
        if (!aiRes.ok) return json({ success: true, pairings: [] });
        const aiData = await aiRes.json();
        const content = aiData?.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(content);
        const pairings = (parsed.pairings ?? []).slice(0, 3).map((p: any) => ({
          dish: String(p.dish ?? "").slice(0, 120),
          reason: String(p.reason ?? "").slice(0, 240),
        }));
        return json({ success: true, wine: { id: wine.id, name: wine.name }, pairings });
      } catch {
        return json({ success: true, pairings: [] });
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("tourist-loyalty error:", e);
    return json({ error: "An error occurred." }, 500);
  }
});
