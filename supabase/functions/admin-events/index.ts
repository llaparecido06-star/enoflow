import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";
import { logAudit } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const { action } = body;

    // ─── PUBLIC ACTIONS ───
    if (action === "list_public") {
      const { winery_id } = body;
      if (!winery_id) return json({ error: "winery_id obrigatório" }, 400);
      const { data, error } = await supabase.from("events")
        .select("*")
        .eq("winery_id", winery_id)
        .gte("starts_at", new Date().toISOString())
        .neq("status", "cancelado")
        .order("starts_at");
      if (error) throw error;
      return json({ success: true, events: data ?? [] });
    }

    if (action === "rsvp") {
      const { event_id, contact_name, contact_whatsapp, party_size, lead_id } = body;
      if (!event_id || !contact_name) return json({ error: "Campos obrigatórios" }, 400);
      const { data: ev } = await supabase.from("events").select("winery_id, rsvp_count, capacity").eq("id", event_id).single();
      if (!ev) return json({ error: "Evento não encontrado" }, 404);
      if (ev.rsvp_count >= ev.capacity) return json({ error: "Evento lotado" }, 409);
      const { error } = await supabase.from("event_rsvps").insert({
        event_id, winery_id: ev.winery_id, contact_name, contact_whatsapp, party_size: party_size ?? 1, lead_id, status: "confirmado",
      });
      if (error) throw error;
      await supabase.from("events").update({ rsvp_count: ev.rsvp_count + (party_size ?? 1) }).eq("id", event_id);
      return json({ success: true });
    }

    // ─── ADMIN ACTIONS ───
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) return json({ error: "Não autorizado" }, 401);

    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) winery_id = body.winery_id;

    const canManage = session.type === "master" || hasMinRole(session.role, "manager");

    if (!action || action === "list") {
      const { data, error } = await supabase.from("events").select("*").eq("winery_id", winery_id).order("starts_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, events: data ?? [] });
    }

    if (action === "upsert") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id, title, description, cover_url, starts_at, ends_at, capacity, price, status, capture_point_id } = body;
      const payload: any = {
        winery_id, title, description, cover_url, starts_at, ends_at,
        capacity: capacity ?? 30, price: price ?? 0, status: status ?? "agendado", capture_point_id,
        updated_at: new Date().toISOString(),
      };
      if (id) {
        const { error } = await supabase.from("events").update(payload).eq("id", id).eq("winery_id", winery_id);
        if (error) throw error;
        await logAudit({ winery_id, admin_id: session.sub, admin_name: session.name, entity: "event", entity_id: id, action: "update", after: payload });
      } else {
        const { data: ins, error } = await supabase.from("events").insert(payload).select("id").single();
        if (error) throw error;
        await logAudit({ winery_id, admin_id: session.sub, admin_name: session.name, entity: "event", entity_id: ins?.id, action: "create", after: payload });
      }
      return json({ success: true });
    }

    if (action === "delete") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id } = body;
      await supabase.from("event_rsvps").delete().eq("event_id", id).eq("winery_id", winery_id);
      const { error } = await supabase.from("events").delete().eq("id", id).eq("winery_id", winery_id);
      if (error) throw error;
      await logAudit({ winery_id, admin_id: session.sub, admin_name: session.name, entity: "event", entity_id: id, action: "delete" });
      return json({ success: true });
    }

    if (action === "list_rsvps") {
      const { event_id } = body;
      const { data, error } = await supabase.from("event_rsvps").select("*").eq("event_id", event_id).eq("winery_id", winery_id).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, rsvps: data ?? [] });
    }

    if (action === "update_rsvp_status") {
      const { id, status } = body;
      const { error } = await supabase.from("event_rsvps").update({ status }).eq("id", id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-events error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
