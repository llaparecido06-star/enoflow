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

      // Log voucher validation activity
      await supabase.from("staff_login_activity").insert({
        admin_id,
        winery_id,
        action: "voucher_validate",
        metadata: { voucher_id: data.id, voucher_code: data.code, total: data.total },
      }).then(() => {});

      return json({ success: true, voucher: { ...data, redeemed: true } });
    }

    if (action === "list_redeemed") {
      const { data, error } = await supabase
        .from("vouchers")
        .select("id, code, total, redeemed, created_at, user_id")
        .eq("winery_id", winery_id)
        .eq("redeemed", true)
        .order("created_at", { ascending: false })
        .limit(50);

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

      // Fetch who validated (from staff_login_activity)
      const voucherIds = (data ?? []).map((v: any) => v.id);
      let validatedByMap: Record<string, { name: string; date: string }> = {};
      if (voucherIds.length > 0) {
        const { data: activities } = await supabase
          .from("staff_login_activity")
          .select("metadata, admin_id, created_at")
          .eq("winery_id", winery_id)
          .eq("action", "voucher_validate");

        for (const act of activities ?? []) {
          const meta = act.metadata as any;
          if (meta?.voucher_id && voucherIds.includes(meta.voucher_id)) {
            // Get admin name
            const { data: adm } = await supabase
              .from("admin_users")
              .select("name")
              .eq("id", act.admin_id)
              .single();
            validatedByMap[meta.voucher_id] = {
              name: adm?.name ?? "—",
              date: act.created_at,
            };
          }
        }
      }

      const vouchers = (data ?? []).map((v: any) => ({
        id: v.id,
        code: v.code,
        total: v.total,
        created_at: v.created_at,
        customer_name: usersMap[v.user_id] ?? "—",
        validated_by: validatedByMap[v.id]?.name ?? "—",
        validated_at: validatedByMap[v.id]?.date ?? v.created_at,
      }));

      return json({ success: true, vouchers });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-vouchers error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
