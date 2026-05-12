import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";
import { logAudit } from "../_shared/audit.ts";

/**
 * Sommelier fast check-in: create or update lead, then optionally issue voucher.
 * Designed for one-tap mobile flow.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.type !== "admin") return json({ error: "Não autorizado" }, 401);

    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const { action } = body;
    const winery_id = session.winery_id;

    if (action === "register_lead") {
      const { name, whatsapp, capture_point_id, gender } = body;
      if (!name || !whatsapp) return json({ error: "Nome e WhatsApp obrigatórios" }, 400);

      // Look up existing lead by whatsapp
      const { data: existing } = await supabase.from("users_leads").select("id, loyalty_points").eq("winery_id", winery_id).eq("whatsapp", whatsapp).maybeSingle();

      let lead_id = existing?.id;
      if (!lead_id) {
        const { data, error } = await supabase.from("users_leads").insert({
          winery_id, name, whatsapp, gender, accepted_terms: true,
          acquisition_category: "checkin", acquisition_location: capture_point_id ?? "checkin",
        }).select("id").single();
        if (error) throw error;
        lead_id = data!.id;
        await logAudit({ winery_id, admin_id: session.sub, admin_name: session.name, entity: "lead", entity_id: lead_id, action: "checkin_create", after: { name, whatsapp } });
      } else {
        await logAudit({ winery_id, admin_id: session.sub, admin_name: session.name, entity: "lead", entity_id: lead_id, action: "checkin_revisit" });
      }

      if (capture_point_id) {
        await supabase.from("capture_history").insert({ winery_id, user_id: lead_id, capture_point_id });
      }

      return json({ success: true, lead_id, returning: !!existing });
    }

    if (action === "issue_voucher") {
      const { lead_id, items, total, channel, capture_point_id } = body;
      if (!lead_id || !Array.isArray(items) || typeof total !== "number") return json({ error: "Dados inválidos" }, 400);

      const code = "CHK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data, error } = await supabase.from("vouchers").insert({
        winery_id, user_id: lead_id, code, items, total, channel: channel ?? "mixed",
      }).select().single();
      if (error) throw error;

      // Auto-debit stock
      try {
        const wineLines = items.filter((it: any) => it?.wine_id && it?.qty);
        if (wineLines.length) {
          const wineIds = wineLines.map((l: any) => l.wine_id);
          const { data: tracked } = await supabase.from("wines").select("id, stock_qty, track_stock").in("id", wineIds).eq("winery_id", winery_id);
          for (const w of tracked ?? []) {
            if (!w.track_stock) continue;
            const line = wineLines.find((l: any) => l.wine_id === w.id);
            const qty = Number(line?.qty ?? 0);
            if (qty <= 0) continue;
            const newQty = Math.max(0, (w.stock_qty ?? 0) - qty);
            await supabase.from("wines").update({ stock_qty: newQty }).eq("id", w.id);
            await supabase.from("stock_movements").insert({ winery_id, wine_id: w.id, delta: -qty, reason: "venda", voucher_id: data.id, admin_id: session.sub });
          }
        }
      } catch (e) { console.error("stock debit:", e); }

      await logAudit({ winery_id, admin_id: session.sub, admin_name: session.name, entity: "voucher", entity_id: data.id, action: "checkin_issue", after: { code, total, channel } });
      if (capture_point_id) {
        await supabase.from("capture_history").insert({ winery_id, user_id: lead_id, capture_point_id });
      }

      return json({ success: true, voucher: data });
    }

    if (action === "quick_catalog") {
      const [{ data: wines }, { data: packages }, { data: capturePoints }] = await Promise.all([
        supabase.from("wines").select("id, name, type, price_bottle, price_glass, on_tasting, on_restaurant, on_shop, image_url").eq("winery_id", winery_id).order("name").limit(200),
        supabase.from("tasting_packages").select("id, name, price, description").eq("winery_id", winery_id).order("name"),
        supabase.from("capture_points").select("id, name, category").eq("winery_id", winery_id).order("name"),
      ]);
      return json({ success: true, wines: wines ?? [], packages: packages ?? [], capture_points: capturePoints ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-checkin error:", e);
    return json({ error: "An error occurred." }, 500);
  }
});
