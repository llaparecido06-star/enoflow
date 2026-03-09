import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createSupabaseAdmin();
    const admin_id = session.sub;
    const winery_id = session.winery_id;

    const body = await req.json();
    const { action, voucher_code } = body;

    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, winery_id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) return json({ error: "Não autorizado" }, 403);

    // ─── VALIDATE ───
    if (action === "validate") {
      if (!voucher_code) return json({ error: "voucher_code required" }, 400);

      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("winery_id", winery_id)
        .eq("code", String(voucher_code).trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ error: "Voucher não encontrado" }, 404);
      if (data.redeemed) return json({ error: "Voucher já foi resgatado" }, 400);

      const { error: updateErr } = await supabase
        .from("vouchers")
        .update({ redeemed: true })
        .eq("id", data.id);

      if (updateErr) throw updateErr;

      await supabase.from("staff_login_activity").insert({
        admin_id,
        winery_id,
        action: "voucher_validate",
        metadata: { voucher_id: data.id, voucher_code: data.code, total: data.total },
      }).then(() => {});

      return json({ success: true, voucher: { ...data, redeemed: true } });
    }

    // ─── LIST REDEEMED (with date filter) ───
    if (action === "list_redeemed") {
      const { date_from, date_to } = body;

      let query = supabase
        .from("vouchers")
        .select("id, code, total, redeemed, created_at, user_id, items")
        .eq("winery_id", winery_id)
        .eq("redeemed", true)
        .order("created_at", { ascending: false })
        .limit(200);

      if (date_from && /^\d{4}-\d{2}-\d{2}$/.test(date_from)) {
        query = query.gte("created_at", `${date_from}T00:00:00`);
      }
      if (date_to && /^\d{4}-\d{2}-\d{2}$/.test(date_to)) {
        query = query.lte("created_at", `${date_to}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set((data ?? []).map((v: any) => v.user_id))];
      let usersMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users_leads")
          .select("id, name")
          .in("id", userIds);
        for (const u of users ?? []) {
          usersMap[u.id] = u.name;
        }
      }

      // Fetch all validate activities for this winery
      const { data: activities } = await supabase
        .from("staff_login_activity")
        .select("metadata, admin_id, created_at")
        .eq("winery_id", winery_id)
        .eq("action", "voucher_validate");

      // Fetch all admin names at once
      const adminIds = [...new Set((activities ?? []).map((a: any) => a.admin_id))];
      let adminsMap: Record<string, string> = {};
      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from("admin_users")
          .select("id, name")
          .in("id", adminIds);
        for (const a of admins ?? []) {
          adminsMap[a.id] = a.name;
        }
      }

      const voucherIds = (data ?? []).map((v: any) => v.id);
      let validatedByMap: Record<string, { name: string; date: string }> = {};
      for (const act of activities ?? []) {
        const meta = act.metadata as any;
        if (meta?.voucher_id && voucherIds.includes(meta.voucher_id)) {
          validatedByMap[meta.voucher_id] = {
            name: adminsMap[act.admin_id] ?? "—",
            date: act.created_at,
          };
        }
      }

      // ── Build ranking (validations per staff) ──
      const rankingCount: Record<string, number> = {};
      for (const act of activities ?? []) {
        const meta = act.metadata as any;
        if (meta?.voucher_id && voucherIds.includes(meta.voucher_id)) {
          rankingCount[act.admin_id] = (rankingCount[act.admin_id] || 0) + 1;
        }
      }
      const ranking = Object.entries(rankingCount)
        .map(([id, count]) => ({ name: adminsMap[id] ?? "—", count }))
        .sort((a, b) => b.count - a.count);

      // ── Build SKU inventory (items sold) ──
      const skuMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      for (const v of data ?? []) {
        const items = v.items as any[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const key = item.name || item.wine_name || "Desconhecido";
          if (!skuMap[key]) {
            skuMap[key] = { name: key, qty: 0, revenue: 0 };
          }
          skuMap[key].qty += (item.qty || item.quantity || 1);
          skuMap[key].revenue += (item.subtotal || (item.price || 0) * (item.qty || item.quantity || 1));
        }
      }
      const skus = Object.values(skuMap).sort((a, b) => b.qty - a.qty);

      const vouchers = (data ?? []).map((v: any) => ({
        id: v.id,
        code: v.code,
        total: v.total,
        created_at: v.created_at,
        customer_name: usersMap[v.user_id] ?? "—",
        validated_by: validatedByMap[v.id]?.name ?? "—",
        validated_at: validatedByMap[v.id]?.date ?? v.created_at,
      }));

      return json({ success: true, vouchers, ranking, skus });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-vouchers error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
