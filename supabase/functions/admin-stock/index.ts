import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";
import { logAudit } from "../_shared/audit.ts";

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

    // ───── LIST STOCK (all wines with stock info) ─────
    if (!action || action === "list_stock") {
      const { only_tracked, status } = body;
      let q = supabase.from("wines").select("id, name, type, year, stock_qty, stock_min, track_stock, image_url, price_bottle").eq("winery_id", winery_id);
      if (only_tracked) q = q.eq("track_stock", true);
      const { data, error } = await q.order("name");
      if (error) throw error;

      let wines = data ?? [];
      if (status === "low") wines = wines.filter((w: any) => w.track_stock && w.stock_qty <= w.stock_min);
      else if (status === "out") wines = wines.filter((w: any) => w.track_stock && w.stock_qty <= 0);
      else if (status === "ok") wines = wines.filter((w: any) => w.track_stock && w.stock_qty > w.stock_min);

      const summary = {
        total: wines.length,
        out_of_stock: wines.filter((w: any) => w.track_stock && w.stock_qty <= 0).length,
        low_stock: wines.filter((w: any) => w.track_stock && w.stock_qty > 0 && w.stock_qty <= w.stock_min).length,
      };
      return json({ success: true, wines, summary });
    }

    // ───── ADJUST STOCK (single wine, delta) ─────
    if (action === "adjust") {
      if (!canManage && session.role !== "staff") return json({ error: "Permissão insuficiente" }, 403);
      const { wine_id, delta, reason, note } = body;
      if (!wine_id || typeof delta !== "number") return json({ error: "wine_id e delta obrigatórios" }, 400);

      const { data: wine } = await supabase.from("wines").select("stock_qty, track_stock").eq("id", wine_id).eq("winery_id", winery_id).single();
      if (!wine) return json({ error: "Vinho não encontrado" }, 404);

      const newQty = Math.max(0, (wine.stock_qty ?? 0) + delta);
      const { error: upErr } = await supabase.from("wines").update({ stock_qty: newQty }).eq("id", wine_id).eq("winery_id", winery_id);
      if (upErr) throw upErr;

      await supabase.from("stock_movements").insert({
        winery_id, wine_id, delta, reason: reason ?? "ajuste", admin_id: session.sub, note,
      });
      await logAudit({ winery_id, admin_id: session.sub, admin_name: session.name, entity: "stock", entity_id: wine_id, action: "adjust", before: { stock_qty: wine.stock_qty }, after: { stock_qty: newQty, delta, reason } });
      return json({ success: true, stock_qty: newQty });
    }

    // ───── SET TRACKING (toggle track_stock + set min) ─────
    if (action === "set_tracking") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { wine_id, track_stock, stock_min } = body;
      const upd: any = {};
      if (typeof track_stock === "boolean") upd.track_stock = track_stock;
      if (typeof stock_min === "number") upd.stock_min = stock_min;
      const { error } = await supabase.from("wines").update(upd).eq("id", wine_id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ───── BULK ENTRY ─────
    if (action === "bulk_entry") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { entries } = body; // [{wine_id, qty, note}]
      if (!Array.isArray(entries)) return json({ error: "entries deve ser array" }, 400);

      for (const e of entries) {
        if (!e.wine_id || !e.qty) continue;
        const { data: w } = await supabase.from("wines").select("stock_qty").eq("id", e.wine_id).eq("winery_id", winery_id).single();
        if (!w) continue;
        const newQty = (w.stock_qty ?? 0) + Number(e.qty);
        await supabase.from("wines").update({ stock_qty: newQty }).eq("id", e.wine_id).eq("winery_id", winery_id);
        await supabase.from("stock_movements").insert({
          winery_id, wine_id: e.wine_id, delta: Number(e.qty), reason: "entrada", admin_id: session.sub, note: e.note,
        });
      }
      return json({ success: true, count: entries.length });
    }

    // ───── MOVEMENTS HISTORY ─────
    if (action === "movements") {
      const { wine_id, limit } = body;
      let q = supabase.from("stock_movements").select("*").eq("winery_id", winery_id);
      if (wine_id) q = q.eq("wine_id", wine_id);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(limit ?? 100);
      if (error) throw error;

      const adminIds = Array.from(new Set((data ?? []).map((m: any) => m.admin_id).filter(Boolean)));
      const wineIds = Array.from(new Set((data ?? []).map((m: any) => m.wine_id).filter(Boolean)));
      const [{ data: admins }, { data: wines }] = await Promise.all([
        adminIds.length ? supabase.from("admin_users").select("id, name").in("id", adminIds) : Promise.resolve({ data: [] }),
        wineIds.length ? supabase.from("wines").select("id, name").in("id", wineIds) : Promise.resolve({ data: [] }),
      ]);
      const adminMap: Record<string, any> = {};
      for (const a of admins ?? []) adminMap[a.id] = a;
      const wineMap: Record<string, any> = {};
      for (const w of wines ?? []) wineMap[w.id] = w;

      const movements = (data ?? []).map((m: any) => ({
        ...m,
        admin_name: adminMap[m.admin_id]?.name,
        wine_name: wineMap[m.wine_id]?.name,
      }));
      return json({ success: true, movements });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-stock error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
