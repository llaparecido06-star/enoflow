import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabase = createSupabaseAdmin();
    const admin_id = session.sub;
    const winery_id = session.winery_id;
    const role = (session as any).role as string | undefined;

    const body = await req.json().catch(() => ({}));
    const { action, ids, status } = body;

    if (action === "list") {
      const { data, error } = await supabase
        .from("staff_notifications")
        .select("*")
        .eq("admin_id", admin_id)
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ success: true, notifications: data ?? [] });
    }

    if (action === "mark_seen") {
      const targetIds: string[] = Array.isArray(ids) ? ids.filter((s) => typeof s === "string").slice(0, 100) : [];
      if (!targetIds.length) return json({ success: true });
      const { error } = await supabase
        .from("staff_notifications")
        .update({ seen_at: new Date().toISOString() })
        .in("id", targetIds)
        .eq("admin_id", admin_id)
        .is("seen_at", null);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "set_status") {
      const targetIds: string[] = Array.isArray(ids) ? ids.filter((s) => typeof s === "string").slice(0, 100) : [];
      if (!targetIds.length) return json({ error: "ids required" }, 400);
      const allowed = ["pending", "seen", "done"];
      const newStatus = typeof status === "string" && allowed.includes(status) ? status : "done";
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === "done") { updates.done_at = new Date().toISOString(); updates.done_by = admin_id; }
      const { error } = await supabase
        .from("staff_notifications")
        .update(updates)
        .in("id", targetIds)
        .eq("admin_id", admin_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: history (manager+/owner/master) — full winery history with filters
    if (action === "history") {
      const isPrivileged = role === "owner" || role === "manager" || role === "master";
      const { from, to, capture_point_id, status: statusFilter } = body;

      let q = supabase
        .from("staff_notifications")
        .select("id, type, title, body, payload, voucher_id, capture_point_id, status, created_at, seen_at, done_at, done_by, admin_id")
        .eq("winery_id", winery_id)
        .order("created_at", { ascending: false })
        .limit(500);

      // Staff/sales only see their own history
      if (!isPrivileged) q = q.eq("admin_id", admin_id);

      if (typeof from === "string" && from) q = q.gte("created_at", from);
      if (typeof to === "string" && to) q = q.lte("created_at", to);
      if (typeof capture_point_id === "string" && capture_point_id) q = q.eq("capture_point_id", capture_point_id);
      if (typeof statusFilter === "string" && ["pending", "seen", "done"].includes(statusFilter)) q = q.eq("status", statusFilter);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data ?? [];
      const cpIds = Array.from(new Set(rows.map((r: any) => r.capture_point_id).filter(Boolean)));
      const adminIds = Array.from(new Set([
        ...rows.map((r: any) => r.admin_id).filter(Boolean),
        ...rows.map((r: any) => r.done_by).filter(Boolean),
      ]));

      const [{ data: cps }, { data: admins }] = await Promise.all([
        cpIds.length
          ? supabase.from("capture_points").select("id, name, category").in("id", cpIds)
          : Promise.resolve({ data: [] as any[] }),
        adminIds.length
          ? supabase.from("admin_users").select("id, name, role").in("id", adminIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const cpMap = new Map((cps ?? []).map((c: any) => [c.id, c]));
      const adminMap = new Map((admins ?? []).map((a: any) => [a.id, a]));

      const enriched = rows.map((r: any) => ({
        ...r,
        capture_point: r.capture_point_id ? cpMap.get(r.capture_point_id) ?? null : null,
        assigned_to: r.admin_id ? adminMap.get(r.admin_id) ?? null : null,
        done_by_admin: r.done_by ? adminMap.get(r.done_by) ?? null : null,
      }));

      // Capture points list for filter dropdown
      const { data: allCps } = await supabase
        .from("capture_points")
        .select("id, name, category")
        .eq("winery_id", winery_id)
        .order("name");

      return json({ success: true, history: enriched, capture_points: allCps ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("staff-notifications error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
