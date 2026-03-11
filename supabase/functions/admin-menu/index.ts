import { validateMenuItemData, isUUID } from "../_shared/validation.ts";
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

    const body = await req.json();
    const { action, item_id, item_data } = body;

    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) {
      winery_id = body.winery_id;
    }

    if (session.type !== "master") {
      const { data: admin, error: adminErr } = await supabase
        .from("admin_users")
        .select("id, winery_id, role")
        .eq("id", admin_id)
        .eq("winery_id", winery_id)
        .single();
      if (adminErr || !admin) return json({ error: "Não autorizado" }, 403);
      if (!hasMinRole(admin.role, "manager")) return json({ error: "Permissão insuficiente" }, 403);
    }

    let result;

    switch (action) {
      case "create": {
        if (!item_data || typeof item_data !== "object") return json({ error: "item_data required" }, 400);
        const validated = validateMenuItemData(item_data);
        if (validated.error) return json({ error: validated.error }, 400);
        const { data, error } = await supabase
          .from("menu_items")
          .insert({ ...validated.data, winery_id })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }
      case "update": {
        if (!isUUID(item_id)) return json({ error: "Valid item_id required" }, 400);
        if (!item_data || typeof item_data !== "object") return json({ error: "item_data required" }, 400);
        const validatedUpdate = validateMenuItemData(item_data);
        if (validatedUpdate.error) return json({ error: validatedUpdate.error }, 400);
        const { data, error } = await supabase
          .from("menu_items")
          .update(validatedUpdate.data)
          .eq("id", item_id)
          .eq("winery_id", winery_id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }
      case "delete": {
        if (!isUUID(item_id)) return json({ error: "Valid item_id required" }, 400);
        const { error } = await supabase
          .from("menu_items")
          .delete()
          .eq("id", item_id)
          .eq("winery_id", winery_id);
        if (error) throw error;
        result = { deleted: true };
        break;
      }
      default:
        return json({ error: "Invalid action" }, 400);
    }

    return json({ success: true, data: result });
  } catch (error) {
    console.error("admin-menu error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
