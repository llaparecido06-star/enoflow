import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

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
    const { action, target_id, name, email, password, role } = body;

    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, role, winery_id")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) return json({ error: "Não autorizado" }, 403);
    if (!hasMinRole(admin.role, "owner")) return json({ error: "Apenas owners podem gerenciar equipe" }, 403);

    // ─── ACTION: list
    if (action === "list") {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, name, email, role, created_at, is_active")
        .eq("winery_id", winery_id)
        .neq("role", "master")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, staff: data ?? [] });
    }

    // ─── ACTION: create
    if (action === "create") {
      if (!name || !email || !password || !role) return json({ error: "name, email, password, role required" }, 400);
      const allowedRoles = ["staff", "manager", "sales"];
      if (!allowedRoles.includes(role)) return json({ error: "Owners podem criar apenas staff e manager" }, 400);
      if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) return json({ error: "Nome inválido" }, 400);
      if (typeof email !== "string" || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email inválido" }, 400);
      if (typeof password !== "string" || password.length < 6 || password.length > 100) return json({ error: "Senha deve ter entre 6 e 100 caracteres" }, 400);

      const { data: existing } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .eq("winery_id", winery_id);

      if (existing && existing.length > 0) return json({ error: "Email já cadastrado nesta vinícola" }, 400);

      const { data: hashResult } = await supabase.rpc("hash_password", { p_password: password.slice(0, 100) });
      if (!hashResult) return json({ error: "Erro ao processar senha" }, 500);

      const { data: newStaff, error } = await supabase
        .from("admin_users")
        .insert({
          name: name.trim().slice(0, 100),
          email: email.trim().toLowerCase().slice(0, 255),
          password_hash: hashResult,
          role,
          winery_id,
        })
        .select("id, name, email, role, created_at")
        .single();

      if (error) throw error;
      return json({ success: true, staff: newStaff });
    }

    // ─── ACTION: update
    if (action === "update") {
      if (!target_id) return json({ error: "target_id required" }, 400);
      const { data: target } = await supabase
        .from("admin_users")
        .select("role, winery_id")
        .eq("id", target_id)
        .single();

      if (!target || target.winery_id !== winery_id) return json({ error: "Funcionário não encontrado" }, 404);
      if (target.role === "owner" || target.role === "master") return json({ error: "Não é possível editar owner/master" }, 403);

      const updates: Record<string, string> = {};
      if (name && typeof name === "string") updates.name = name.trim().slice(0, 100);
      if (email && typeof email === "string") updates.email = email.trim().toLowerCase().slice(0, 255);
      if (password && typeof password === "string" && password.length >= 6) {
        const { data: hashResult } = await supabase.rpc("hash_password", { p_password: password.slice(0, 100) });
        if (hashResult) updates.password_hash = hashResult;
      }
      if (role && ["staff", "manager", "sales"].includes(role)) updates.role = role;

      if (Object.keys(updates).length === 0) return json({ error: "Nada para atualizar" }, 400);

      const { error } = await supabase
        .from("admin_users")
        .update(updates)
        .eq("id", target_id)
        .eq("winery_id", winery_id);

      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: delete
    if (action === "delete") {
      if (!target_id) return json({ error: "target_id required" }, 400);
      const { data: target } = await supabase
        .from("admin_users")
        .select("role, winery_id")
        .eq("id", target_id)
        .single();

      if (!target || target.winery_id !== winery_id) return json({ error: "Funcionário não encontrado" }, 404);
      if (target.role === "owner" || target.role === "master") return json({ error: "Não é possível remover owner/master" }, 403);

      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", target_id)
        .eq("winery_id", winery_id);

      if (error) throw error;
      return json({ success: true });
    }

    // ─── ACTION: toggle_status
    if (action === "toggle_status") {
      if (!target_id) return json({ error: "target_id required" }, 400);
      const { data: target } = await supabase
        .from("admin_users")
        .select("role, winery_id")
        .eq("id", target_id)
        .single();

      if (!target || target.winery_id !== winery_id) return json({ error: "Funcionário não encontrado" }, 404);
      if (target.role === "owner" || target.role === "master") return json({ error: "Não é possível alterar status de owner/master" }, 403);

      const { error } = await supabase
        .from("admin_users")
        .update({ is_active: body.is_active === true })
        .eq("id", target_id)
        .eq("winery_id", winery_id);

      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("admin-staff error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
