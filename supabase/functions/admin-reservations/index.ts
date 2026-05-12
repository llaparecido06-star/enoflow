import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const supabase = createSupabaseAdmin();

    // ─── PUBLIC: slots available for tourist UI (no auth) ───
    if (action === "available_slots") {
      const { winery_id, weekday } = body;
      if (!winery_id) return json({ error: "winery_id obrigatório" }, 400);
      const q = supabase.from("reservation_slots").select("*").eq("winery_id", winery_id).eq("active", true);
      if (typeof weekday === "number") q.eq("weekday", weekday);
      const { data, error } = await q.order("weekday").order("start_time");
      if (error) throw error;
      return json({ success: true, slots: data ?? [] });
    }

    if (action === "tourist_create") {
      const { winery_id, slot_id, scheduled_at, party_size, contact_name, contact_whatsapp, notes, lead_id } = body;
      if (!winery_id || !scheduled_at || !contact_name || !contact_whatsapp) {
        return json({ error: "Campos obrigatórios faltando" }, 400);
      }
      const { data, error } = await supabase.from("reservations").insert({
        winery_id, slot_id, scheduled_at, party_size: party_size ?? 1,
        contact_name, contact_whatsapp, notes, lead_id, source: "tourist", status: "pendente",
      }).select().single();
      if (error) throw error;
      return json({ success: true, reservation: data });
    }

    // ─── AUTH required from here ─────────────────────────
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) return json({ error: "Não autorizado" }, 401);

    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) winery_id = body.winery_id;

    const canManage = session.type === "master" || hasMinRole(session.role, "manager");

    // ───── SLOTS ─────
    if (action === "list_slots") {
      const { data, error } = await supabase.from("reservation_slots").select("*").eq("winery_id", winery_id).order("weekday").order("start_time");
      if (error) throw error;
      return json({ success: true, slots: data ?? [] });
    }

    if (action === "upsert_slot") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id, capture_point_id, weekday, start_time, end_time, capacity, price, active } = body;
      if (id) {
        const { data, error } = await supabase.from("reservation_slots")
          .update({ capture_point_id, weekday, start_time, end_time, capacity, price, active, updated_at: new Date().toISOString() })
          .eq("id", id).eq("winery_id", winery_id).select().single();
        if (error) throw error;
        return json({ success: true, slot: data });
      } else {
        const { data, error } = await supabase.from("reservation_slots")
          .insert({ winery_id, capture_point_id, weekday, start_time, end_time, capacity: capacity ?? 10, price: price ?? 0, active: active !== false })
          .select().single();
        if (error) throw error;
        return json({ success: true, slot: data });
      }
    }

    if (action === "delete_slot") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id } = body;
      const { error } = await supabase.from("reservation_slots").delete().eq("id", id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ───── RESERVATIONS ─────
    if (action === "list_reservations") {
      const { from, to, status, assigned_admin_id } = body;
      let q = supabase.from("reservations").select("*").eq("winery_id", winery_id);
      if (from) q = q.gte("scheduled_at", from);
      if (to) q = q.lte("scheduled_at", to);
      if (status) q = q.eq("status", status);
      if (assigned_admin_id) q = q.eq("assigned_admin_id", assigned_admin_id);
      // Sales: only own
      if (session.role === "sales") q = q.eq("assigned_admin_id", session.sub);
      const { data, error } = await q.order("scheduled_at", { ascending: true }).limit(500);
      if (error) throw error;

      // Enrich with lead & admin info
      const leadIds = Array.from(new Set((data ?? []).map((r: any) => r.lead_id).filter(Boolean)));
      const adminIds = Array.from(new Set((data ?? []).map((r: any) => r.assigned_admin_id).filter(Boolean)));
      const [{ data: leads }, { data: admins }] = await Promise.all([
        leadIds.length ? supabase.from("users_leads").select("id, name, whatsapp").in("id", leadIds) : Promise.resolve({ data: [] }),
        adminIds.length ? supabase.from("admin_users").select("id, name").in("id", adminIds) : Promise.resolve({ data: [] }),
      ]);
      const leadMap: Record<string, any> = {};
      for (const l of leads ?? []) leadMap[l.id] = l;
      const adminMap: Record<string, any> = {};
      for (const a of admins ?? []) adminMap[a.id] = a;

      const reservations = (data ?? []).map((r: any) => ({
        ...r,
        lead: r.lead_id ? leadMap[r.lead_id] : null,
        assigned_admin: r.assigned_admin_id ? adminMap[r.assigned_admin_id] : null,
      }));
      return json({ success: true, reservations });
    }

    if (action === "create_reservation") {
      const { lead_id, slot_id, capture_point_id, scheduled_at, party_size, notes, contact_name, contact_whatsapp, assigned_admin_id } = body;
      if (!scheduled_at) return json({ error: "scheduled_at obrigatório" }, 400);
      const { data, error } = await supabase.from("reservations").insert({
        winery_id, lead_id, slot_id, capture_point_id, scheduled_at,
        party_size: party_size ?? 1, notes, contact_name, contact_whatsapp,
        assigned_admin_id: assigned_admin_id ?? session.sub,
        source: "admin", status: "confirmada",
      }).select().single();
      if (error) throw error;

      // Bump lead to qualificado if exists
      if (lead_id) {
        await supabase.from("crm_lead_state").upsert({
          winery_id, lead_id, stage: "qualificado", stage_changed_at: new Date().toISOString(),
        }, { onConflict: "lead_id" });
      }
      return json({ success: true, reservation: data });
    }

    if (action === "update_status") {
      const { id, status } = body;
      if (!id || !status) return json({ error: "id e status obrigatórios" }, 400);
      const { data, error } = await supabase.from("reservations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id).eq("winery_id", winery_id).select().single();
      if (error) throw error;

      // On compareceu, bump lead to convertido and add note
      if (status === "compareceu" && data?.lead_id) {
        await supabase.from("crm_lead_notes").insert({
          winery_id, lead_id: data.lead_id, admin_id: session.sub,
          body: `Compareceu à reserva em ${new Date(data.scheduled_at).toLocaleString("pt-BR")}`,
        });
      }
      return json({ success: true, reservation: data });
    }

    if (action === "assign") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id, assigned_admin_id } = body;
      const { data, error } = await supabase.from("reservations")
        .update({ assigned_admin_id, updated_at: new Date().toISOString() })
        .eq("id", id).eq("winery_id", winery_id).select().single();
      if (error) throw error;
      return json({ success: true, reservation: data });
    }

    if (action === "delete_reservation") {
      if (!canManage) return json({ error: "Permissão insuficiente" }, 403);
      const { id } = body;
      const { error } = await supabase.from("reservations").delete().eq("id", id).eq("winery_id", winery_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-reservations error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
