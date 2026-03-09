import { validatePackageData, isUUID } from "../_shared/validation.ts";
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
    const { action, package_id, package_data } = body;

    const { data: admin, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, winery_id, role")
      .eq("id", admin_id)
      .eq("winery_id", winery_id)
      .single();

    if (adminErr || !admin) return json({ error: "Não autorizado" }, 403);
    if (!hasMinRole(admin.role, "manager")) return json({ error: "Permissão insuficiente" }, 403);

    switch (action) {
      case "create": {
        if (!package_data || typeof package_data !== "object") return json({ error: "package_data required" }, 400);
        const validated = validatePackageData(package_data);
        if (validated.error) return json({ error: validated.error }, 400);
        const { data, error } = await supabase
          .from("tasting_packages")
          .insert({ ...validated.data, winery_id })
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }
      case "update": {
        if (!isUUID(package_id)) return json({ error: "Valid package_id required" }, 400);
        if (!package_data || typeof package_data !== "object") return json({ error: "package_data required" }, 400);
        const validatedUpdate = validatePackageData(package_data);
        if (validatedUpdate.error) return json({ error: validatedUpdate.error }, 400);
        const { data, error } = await supabase
          .from("tasting_packages")
          .update(validatedUpdate.data)
          .eq("id", package_id)
          .eq("winery_id", winery_id)
          .select()
          .single();
        if (error) throw error;
        return json({ success: true, data });
      }
      case "delete": {
        if (!isUUID(package_id)) return json({ error: "Valid package_id required" }, 400);
        const { error } = await supabase
          .from("tasting_packages")
          .delete()
          .eq("id", package_id)
          .eq("winery_id", winery_id);
        if (error) throw error;
        return json({ success: true, deleted: true });
      }
      default:
        return json({ error: "Invalid action" }, 400);
    }
  } catch (error) {
    console.error("admin-packages error:", error);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
