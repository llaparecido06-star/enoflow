import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, admin_id, winery_id, voucher_code } = body;

    if (!admin_id || !winery_id) {
      return json({ error: "admin_id and winery_id required" }, 400);
    }

    // Verify admin belongs to winery
    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, winery_id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) {
      return json({ error: "Não autorizado" }, 403);
    }

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

      return json({ success: true, voucher: { ...data, redeemed: true } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
});
