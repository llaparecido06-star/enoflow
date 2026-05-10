import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

const STAGES = ["novo", "contatado", "qualificado", "convertido", "perdido"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createSupabaseAdmin();
    const admin_id = session.sub;
    const body = await req.json();
    // Allow master to operate on any winery_id passed in body; admins are pinned to their session winery
    const winery_id = session.type === "master" && body.winery_id ? body.winery_id : session.winery_id;
    const { action } = body;

    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, role, winery_id")
      .eq("id", admin_id)
      .single();
    if (!admin) return json({ error: "Não autorizado" }, 403);
    if (session.type === "admin" && admin.winery_id !== winery_id) {
      return json({ error: "Não autorizado" }, 403);
    }
    // Sales/atendente has access only to lead-centric actions; manager+ has full access.
    const ROLE_ALIAS: Record<string, string> = { atendente: "sales", funcionario: "staff", gerente: "manager", dono: "owner" };
    const normRole = ROLE_ALIAS[admin.role] || admin.role;
    const SALES_ALLOWED = new Set([
      "list_pipeline", "lead_360", "move_stage", "move_stage_with_reason", "update_state",
      "add_note", "delete_note", "list_tasks", "upsert_task", "complete_task", "delete_task",
      "task_counts", "list_scheduled", "schedule_messages", "mark_scheduled_sent",
      "mark_scheduled_error", "cancel_scheduled", "log_message", "list_templates",
      "list_segments", "list_staff", "assign_lead", "claim_lead", "notifications",
      "get_prefs", "update_prefs", "get_queue",
    ]);
    const isSales = normRole === "sales";
    if (!isSales && !hasMinRole(admin.role, "manager")) {
      return json({ error: "Sem permissão" }, 403);
    }
    if (isSales && !SALES_ALLOWED.has(body.action)) {
      return json({ error: "Sem permissão para esta ação" }, 403);
    }

    // ─── list_pipeline: leads enriched + state
    if (action === "list_pipeline") {
      const { data: leads } = await supabase
        .from("users_leads")
        .select("id, name, whatsapp, created_at, preferences_summary, birth_date, gender, income_class, loyalty_points")
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false });

      const leadIds = (leads ?? []).map((l) => l.id);
      const nowIso = new Date().toISOString();
      const [statesRes, vouchersRes, capturesRes, tasksRes] = await Promise.all([
        leadIds.length ? supabase.from("crm_lead_state").select("*").in("lead_id", leadIds) : { data: [] as any[] },
        leadIds.length ? supabase.from("vouchers").select("user_id, total, redeemed, created_at").in("user_id", leadIds).eq("winery_id", winery_id) : { data: [] as any[] },
        leadIds.length ? supabase.from("capture_history").select("user_id, created_at").in("user_id", leadIds).eq("winery_id", winery_id) : { data: [] as any[] },
        leadIds.length ? supabase.from("crm_tasks").select("lead_id, due_at, title").in("lead_id", leadIds).eq("status", "pendente").order("due_at", { ascending: true }) : { data: [] as any[] },
      ]);

      const stateMap: Record<string, any> = {};
      for (const s of (statesRes.data as any[]) ?? []) stateMap[s.lead_id] = s;

      const ltvMap: Record<string, { total: number; count: number; last: string | null }> = {};
      for (const v of (vouchersRes.data as any[]) ?? []) {
        const m = ltvMap[v.user_id] ?? (ltvMap[v.user_id] = { total: 0, count: 0, last: null });
        if (v.redeemed) {
          m.total += Number(v.total || 0);
          m.count++;
        }
        if (!m.last || v.created_at > m.last) m.last = v.created_at;
      }
      const visitsMap: Record<string, { count: number; last: string | null }> = {};
      for (const c of (capturesRes.data as any[]) ?? []) {
        const m = visitsMap[c.user_id] ?? (visitsMap[c.user_id] = { count: 0, last: null });
        m.count++;
        if (!m.last || c.created_at > m.last) m.last = c.created_at;
      }
      const taskMap: Record<string, { due_at: string; title: string; overdue: boolean }> = {};
      for (const t of (tasksRes.data as any[]) ?? []) {
        if (!t.lead_id || taskMap[t.lead_id]) continue; // first/earliest only
        taskMap[t.lead_id] = { due_at: t.due_at, title: t.title, overdue: t.due_at < nowIso };
      }

      const enriched = (leads ?? []).map((l) => {
        const s = stateMap[l.id];
        return {
          ...l,
          stage: s?.stage ?? "novo",
          assigned_admin_id: s?.assigned_admin_id ?? null,
          tags: s?.tags ?? [],
          estimated_value: s?.estimated_value ?? 0,
          stage_changed_at: s?.stage_changed_at ?? null,
          lost_reason: s?.lost_reason ?? null,
          ltv: ltvMap[l.id]?.total ?? 0,
          voucher_count: ltvMap[l.id]?.count ?? 0,
          last_voucher_at: ltvMap[l.id]?.last ?? null,
          visit_count: visitsMap[l.id]?.count ?? 0,
          last_visit_at: visitsMap[l.id]?.last ?? null,
          next_task: taskMap[l.id] ?? null,
        };
      });

      return json({ success: true, leads: enriched, stages: STAGES });
    }

    // ─── move_stage
    if (action === "move_stage") {
      const { lead_id, stage } = body;
      if (!lead_id || !STAGES.includes(stage)) return json({ error: "Invalid params" }, 400);
      await supabase.from("crm_lead_state").upsert(
        { lead_id, winery_id, stage, stage_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "lead_id" }
      );
      return json({ success: true });
    }

    // ─── update_state (assign / tags / estimated value)
    if (action === "update_state") {
      const { lead_id, assigned_admin_id, tags, estimated_value } = body;
      if (!lead_id) return json({ error: "lead_id required" }, 400);
      const updates: any = { lead_id, winery_id, updated_at: new Date().toISOString() };
      if (assigned_admin_id !== undefined) updates.assigned_admin_id = assigned_admin_id;
      if (Array.isArray(tags)) updates.tags = tags.slice(0, 20).map((t: string) => String(t).slice(0, 30));
      if (typeof estimated_value === "number") updates.estimated_value = estimated_value;
      await supabase.from("crm_lead_state").upsert(updates, { onConflict: "lead_id" });
      return json({ success: true });
    }

    // ─── lead_360
    if (action === "lead_360") {
      const { lead_id } = body;
      if (!lead_id) return json({ error: "lead_id required" }, 400);
      const [leadR, stateR, vouchersR, capturesR, ratingsR, favoritesR, notesR, msgsR] = await Promise.all([
        supabase.from("users_leads").select("*").eq("id", lead_id).eq("winery_id", winery_id).maybeSingle(),
        supabase.from("crm_lead_state").select("*").eq("lead_id", lead_id).maybeSingle(),
        supabase.from("vouchers").select("*").eq("user_id", lead_id).eq("winery_id", winery_id).order("created_at", { ascending: false }),
        supabase.from("capture_history").select("*").eq("user_id", lead_id).eq("winery_id", winery_id).order("created_at", { ascending: false }),
        supabase.from("ratings").select("wine_id, stars_acidity, stars_body, stars_sweetness, created_at").eq("user_id", lead_id),
        supabase.from("favorites").select("wine_id").eq("user_id", lead_id).eq("winery_id", winery_id),
        supabase.from("crm_lead_notes").select("*").eq("lead_id", lead_id).order("created_at", { ascending: false }),
        supabase.from("crm_message_log").select("*").eq("lead_id", lead_id).order("sent_at", { ascending: false }),
      ]);
      if (!leadR.data) return json({ error: "Lead not found" }, 404);
      return json({
        success: true,
        lead: leadR.data,
        state: stateR.data,
        vouchers: vouchersR.data ?? [],
        captures: capturesR.data ?? [],
        ratings: ratingsR.data ?? [],
        favorites: favoritesR.data ?? [],
        notes: notesR.data ?? [],
        messages: msgsR.data ?? [],
      });
    }

    // ─── add_note
    if (action === "add_note") {
      const { lead_id, note_body } = body;
      if (!lead_id || !note_body) return json({ error: "params required" }, 400);
      const { data, error } = await supabase
        .from("crm_lead_notes")
        .insert({ lead_id, winery_id, admin_id, body: String(note_body).slice(0, 2000) })
        .select()
        .single();
      if (error) throw error;
      return json({ success: true, note: data });
    }

    // ─── delete_note
    if (action === "delete_note") {
      const { note_id } = body;
      if (!note_id) return json({ error: "note_id required" }, 400);
      await supabase.from("crm_lead_notes").delete().eq("id", note_id).eq("winery_id", winery_id);
      return json({ success: true });
    }

    // ─── templates: list / upsert / delete
    if (action === "list_templates") {
      const { data } = await supabase
        .from("crm_message_templates")
        .select("*")
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false });
      return json({ success: true, templates: data ?? [] });
    }
    if (action === "upsert_template") {
      const { template_id, name, stage, body: tplBody } = body;
      if (!name || !tplBody) return json({ error: "name and body required" }, 400);
      const payload = {
        winery_id,
        name: String(name).slice(0, 100),
        stage: stage ? String(stage).slice(0, 30) : null,
        body: String(tplBody).slice(0, 2000),
      };
      if (template_id) {
        const { data, error } = await supabase
          .from("crm_message_templates")
          .update(payload)
          .eq("id", template_id)
          .eq("winery_id", winery_id)
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, template: data });
      }
      const { data, error } = await supabase.from("crm_message_templates").insert(payload).select().single();
      if (error) throw error;
      return json({ success: true, template: data });
    }
    if (action === "delete_template") {
      const { template_id } = body;
      if (!template_id) return json({ error: "template_id required" }, 400);
      await supabase.from("crm_message_templates").delete().eq("id", template_id).eq("winery_id", winery_id);
      return json({ success: true });
    }

    // ─── log_message (after manual wa.me send)
    if (action === "log_message") {
      const { lead_id, template_id, channel, body: msgBody } = body;
      if (!lead_id) return json({ error: "lead_id required" }, 400);
      const { data, error } = await supabase
        .from("crm_message_log")
        .insert({
          lead_id,
          winery_id,
          admin_id,
          template_id: template_id ?? null,
          channel: channel ?? "whatsapp",
          body: msgBody ? String(msgBody).slice(0, 2000) : null,
        })
        .select()
        .single();
      if (error) throw error;
      return json({ success: true, message: data });
    }

    // ─── segments save / list / delete
    if (action === "list_segments") {
      const { data } = await supabase
        .from("crm_saved_segments")
        .select("*")
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false });
      return json({ success: true, segments: data ?? [] });
    }
    if (action === "save_segment") {
      const { name, filters } = body;
      if (!name) return json({ error: "name required" }, 400);
      const { data, error } = await supabase
        .from("crm_saved_segments")
        .insert({ winery_id, name: String(name).slice(0, 100), filters: filters ?? {} })
        .select()
        .single();
      if (error) throw error;
      return json({ success: true, segment: data });
    }
    if (action === "delete_segment") {
      const { segment_id } = body;
      if (!segment_id) return json({ error: "segment_id required" }, 400);
      await supabase.from("crm_saved_segments").delete().eq("id", segment_id).eq("winery_id", winery_id);
      return json({ success: true });
    }

    // ─── TASKS ───────────────────────────────────────────────────
    if (action === "list_tasks") {
      const { scope, lead_id } = body; // scope: 'mine' | 'winery' | 'lead'
      let q = supabase.from("crm_tasks").select("*").eq("winery_id", winery_id);
      if (scope === "mine") q = q.eq("admin_id", admin_id);
      if (scope === "lead" && lead_id) q = q.eq("lead_id", lead_id);
      const { data } = await q.order("due_at", { ascending: true });
      return json({ success: true, tasks: data ?? [] });
    }

    if (action === "upsert_task") {
      const { task_id, lead_id, assigned_admin_id, title, description, due_at, type } = body;
      if (!title || !due_at) return json({ error: "title and due_at required" }, 400);
      const payload: any = {
        winery_id,
        title: String(title).slice(0, 200),
        description: description ? String(description).slice(0, 2000) : null,
        due_at,
        type: type || "followup",
        admin_id: assigned_admin_id || admin_id,
        lead_id: lead_id || null,
      };
      if (task_id) {
        const { data, error } = await supabase
          .from("crm_tasks")
          .update(payload)
          .eq("id", task_id)
          .eq("winery_id", winery_id)
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, task: data });
      }
      const { data, error } = await supabase
        .from("crm_tasks")
        .insert({ ...payload, created_by: admin_id })
        .select()
        .single();
      if (error) throw error;
      return json({ success: true, task: data });
    }

    if (action === "complete_task") {
      const { task_id } = body;
      if (!task_id) return json({ error: "task_id required" }, 400);
      const { data: task } = await supabase
        .from("crm_tasks")
        .update({ status: "feito", completed_at: new Date().toISOString() })
        .eq("id", task_id)
        .eq("winery_id", winery_id)
        .select()
        .single();
      // Auto-log na timeline do lead
      if (task?.lead_id) {
        await supabase.from("crm_lead_notes").insert({
          lead_id: task.lead_id,
          winery_id,
          admin_id,
          body: `✓ Tarefa concluída: ${task.title}`,
        });
      }
      return json({ success: true });
    }

    if (action === "delete_task") {
      const { task_id } = body;
      if (!task_id) return json({ error: "task_id required" }, 400);
      await supabase.from("crm_tasks").delete().eq("id", task_id).eq("winery_id", winery_id);
      return json({ success: true });
    }

    if (action === "task_counts") {
      const now = new Date().toISOString();
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const { data: pending } = await supabase
        .from("crm_tasks")
        .select("id, due_at, admin_id")
        .eq("winery_id", winery_id)
        .eq("status", "pendente");
      let overdue = 0, today = 0, upcoming = 0, mineOverdue = 0;
      for (const t of pending ?? []) {
        if (t.due_at < now) {
          overdue++;
          if (t.admin_id === admin_id) mineOverdue++;
        } else if (t.due_at <= todayEnd.toISOString()) today++;
        else upcoming++;
      }
      return json({ success: true, overdue, today, upcoming, mineOverdue });
    }

    // ─── SCHEDULED MESSAGES ──────────────────────────────────────
    if (action === "schedule_messages") {
      const { lead_ids, template_id, body_template, scheduled_for } = body;
      if (!Array.isArray(lead_ids) || lead_ids.length === 0 || !scheduled_for) {
        return json({ error: "lead_ids and scheduled_for required" }, 400);
      }
      // Resolve body per lead
      const { data: leads } = await supabase
        .from("users_leads")
        .select("id, name, whatsapp")
        .in("id", lead_ids)
        .eq("winery_id", winery_id);
      const rows = (leads ?? []).map((l: any) => ({
        winery_id,
        lead_id: l.id,
        template_id: template_id || null,
        body_resolved: String(body_template || "")
          .replace(/\{\{nome\}\}/g, (l.name || "").split(" ")[0]),
        scheduled_for,
        status: "pendente",
        created_by: admin_id,
      }));
      if (rows.length === 0) return json({ error: "No valid leads" }, 400);
      const { error } = await supabase.from("crm_scheduled_messages").insert(rows);
      if (error) throw error;
      return json({ success: true, count: rows.length });
    }

    if (action === "list_scheduled") {
      const { filter } = body; // 'pending' | 'ready' | 'all'
      let q = supabase
        .from("crm_scheduled_messages")
        .select("*, users_leads:lead_id(name, whatsapp)")
        .eq("winery_id", winery_id);
      if (filter === "pending") q = q.eq("status", "pendente");
      if (filter === "ready") {
        q = q.eq("status", "pendente").lte("scheduled_for", new Date().toISOString());
      }
      const { data } = await q.order("scheduled_for", { ascending: true }).limit(500);
      return json({ success: true, scheduled: data ?? [] });
    }

    if (action === "mark_scheduled_sent") {
      const { message_id } = body;
      if (!message_id) return json({ error: "message_id required" }, 400);
      const { data: msg } = await supabase
        .from("crm_scheduled_messages")
        .update({ status: "enviada", sent_at: new Date().toISOString() })
        .eq("id", message_id)
        .eq("winery_id", winery_id)
        .select()
        .single();
      if (msg) {
        await supabase.from("crm_message_log").insert({
          lead_id: msg.lead_id,
          winery_id,
          admin_id,
          template_id: msg.template_id,
          channel: "whatsapp",
          body: msg.body_resolved,
        });
      }
      return json({ success: true });
    }

    if (action === "cancel_scheduled") {
      const { message_id } = body;
      if (!message_id) return json({ error: "message_id required" }, 400);
      await supabase
        .from("crm_scheduled_messages")
        .update({ status: "cancelada" })
        .eq("id", message_id)
        .eq("winery_id", winery_id);
      return json({ success: true });
    }

    // ─── STAFF list (para atribuir tarefas)
    if (action === "list_staff") {
      const { data } = await supabase
        .from("admin_users")
        .select("id, name, role")
        .eq("winery_id", winery_id)
        .eq("is_active", true);
      return json({ success: true, staff: data ?? [] });
    }

    // ─── Lost reason ao mover para perdido
    if (action === "move_stage_with_reason") {
      const { lead_id, stage, lost_reason } = body;
      if (!lead_id || !STAGES.includes(stage)) return json({ error: "Invalid params" }, 400);
      await supabase.from("crm_lead_state").upsert(
        {
          lead_id,
          winery_id,
          stage,
          lost_reason: stage === "perdido" ? (lost_reason || null) : null,
          stage_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lead_id" }
      );
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-crm error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
