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
    const winery_id = session.winery_id;
    const body = await req.json();
    const { action } = body;

    // ─── LIST campaigns
    if (action === "list") {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ campaigns: data ?? [] });
    }

    // ─── CREATE campaign
    if (action === "create") {
      const { title, message, type, scheduled_at } = body;
      if (!title || !message) return json({ error: "title and message required" }, 400);

      const allowedTypes = ["promotion", "new_wine", "event", "follow_up"];
      const safeType = allowedTypes.includes(type) ? type : "promotion";

      const { data, error } = await supabase.from("campaigns").insert({
        winery_id,
        title: String(title).slice(0, 100),
        message: String(message).slice(0, 1000),
        type: safeType,
        scheduled_at: scheduled_at || null,
      }).select().single();

      if (error) throw error;
      return json({ success: true, campaign: data });
    }

    // ─── UPDATE campaign
    if (action === "update") {
      const { id, title, message, type, status, scheduled_at } = body;
      if (!id) return json({ error: "id required" }, 400);

      const updates: Record<string, unknown> = {};
      if (title) updates.title = String(title).slice(0, 100);
      if (message) updates.message = String(message).slice(0, 1000);
      const allowedTypes = ["promotion", "new_wine", "event", "follow_up"];
      if (type && allowedTypes.includes(type)) updates.type = type;
      const allowedStatuses = ["draft", "sent", "scheduled"];
      if (status && allowedStatuses.includes(status)) updates.status = status;
      if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at || null;

      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id)
        .eq("winery_id", winery_id)
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, campaign: data });
    }

    // ─── DELETE campaign
    if (action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "id required" }, 400);

      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id)
        .eq("winery_id", winery_id);

      if (error) throw error;
      return json({ success: true });
    }

    // ─── GET LEADS for sending (with filters)
    if (action === "get_leads") {
      const { filters } = body;
      let query = supabase
        .from("users_leads")
        .select("id, name, whatsapp, gender, income_class, preferences_summary, created_at")
        .eq("winery_id", winery_id);

      if (filters) {
        if (filters.gender && ["masculino", "feminino", "nao_informar"].includes(filters.gender)) {
          query = query.eq("gender", filters.gender);
        }
        if (filters.income_class) {
          const allowed = ["A", "B", "C", "D", "E", "ate_3k", "3k_8k", "8k_15k", "acima_15k"];
          if (allowed.includes(filters.income_class)) {
            query = query.eq("income_class", filters.income_class);
          }
        }
        if (filters.has_persona === true) {
          query = query.not("preferences_summary", "is", null);
        }
        if (filters.registered_after && /^\d{4}-\d{2}-\d{2}$/.test(filters.registered_after)) {
          query = query.gte("created_at", filters.registered_after);
        }
        if (filters.registered_before && /^\d{4}-\d{2}-\d{2}$/.test(filters.registered_before)) {
          query = query.lte("created_at", filters.registered_before + "T23:59:59");
        }
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return json({ leads: data ?? [] });
    }

    // ─── MARK AS SENT
    if (action === "mark_sent") {
      const { id, sent_count } = body;
      if (!id) return json({ error: "id required" }, 400);

      const { data, error } = await supabase
        .from("campaigns")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          sent_count: typeof sent_count === "number" ? sent_count : 0,
        })
        .eq("id", id)
        .eq("winery_id", winery_id)
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, campaign: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-campaigns error:", error);
    return json({ error: "An error occurred" }, 500);
  }
});
