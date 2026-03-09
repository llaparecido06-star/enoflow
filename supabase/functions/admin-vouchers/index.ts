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

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-vouchers error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
