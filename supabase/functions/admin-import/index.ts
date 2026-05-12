import { verifySession, json, corsHeaders, createSupabaseAdmin, hasMinRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || (session.type !== "admin" && session.type !== "master")) return json({ error: "Não autorizado" }, 401);
    if (session.type !== "master" && !hasMinRole(session.role, "owner")) return json({ error: "Apenas owner pode importar" }, 403);

    const supabase = createSupabaseAdmin();
    const body = await req.json();
    const { action, rows, dry_run } = body;

    let winery_id = session.winery_id;
    if (session.type === "master" && body.winery_id) winery_id = body.winery_id;

    if (!Array.isArray(rows)) return json({ error: "rows deve ser array" }, 400);

    const errors: Array<{ line: number; message: string }> = [];
    let successCount = 0;

    if (action === "import_wines") {
      const valid: any[] = [];
      rows.forEach((r: any, idx: number) => {
        const name = (r.name ?? r.nome ?? "").toString().trim();
        const type = (r.type ?? r.tipo ?? "").toString().trim();
        const price = Number(r.price_bottle ?? r.preco ?? r.price ?? 0);
        if (!name) return errors.push({ line: idx + 2, message: "Nome obrigatório" });
        if (!type) return errors.push({ line: idx + 2, message: "Tipo obrigatório" });
        if (isNaN(price)) return errors.push({ line: idx + 2, message: "Preço inválido" });
        valid.push({
          winery_id, name, type,
          price_bottle: price,
          year: r.year ? Number(r.year) : null,
          region: r.region ?? null,
          grape: r.grape ?? null,
          description: r.description ?? null,
          alcohol_content: r.alcohol_content ?? null,
          on_shop: r.on_shop === "false" ? false : true,
          on_restaurant: r.on_restaurant === "true",
          on_tasting: r.on_tasting === "true",
        });
      });
      if (!dry_run && valid.length) {
        const { error } = await supabase.from("wines").insert(valid);
        if (error) throw error;
        successCount = valid.length;
      } else {
        successCount = valid.length;
      }
      return json({ success: true, dry_run: !!dry_run, count: successCount, errors });
    }

    if (action === "import_leads") {
      const valid: any[] = [];
      rows.forEach((r: any, idx: number) => {
        const name = (r.name ?? r.nome ?? "").toString().trim();
        const whatsapp = (r.whatsapp ?? r.telefone ?? r.phone ?? "").toString().trim();
        if (!name) return errors.push({ line: idx + 2, message: "Nome obrigatório" });
        if (!whatsapp) return errors.push({ line: idx + 2, message: "WhatsApp obrigatório" });
        valid.push({
          winery_id, name, whatsapp,
          accepted_terms: true,
          acquisition_category: r.category ?? r.acquisition_category ?? "import",
          acquisition_location: r.location ?? r.acquisition_location ?? "csv",
          gender: r.gender ?? null,
          birth_date: r.birth_date ?? null,
        });
      });
      if (!dry_run && valid.length) {
        const { error } = await supabase.from("users_leads").insert(valid);
        if (error) throw error;
        successCount = valid.length;
      } else {
        successCount = valid.length;
      }
      return json({ success: true, dry_run: !!dry_run, count: successCount, errors });
    }

    if (action === "import_menu") {
      const valid: any[] = [];
      rows.forEach((r: any, idx: number) => {
        const name = (r.name ?? r.nome ?? "").toString().trim();
        const category = (r.category ?? r.categoria ?? "").toString().trim();
        const price = Number(r.price ?? r.preco ?? 0);
        if (!name) return errors.push({ line: idx + 2, message: "Nome obrigatório" });
        if (!category) return errors.push({ line: idx + 2, message: "Categoria obrigatória" });
        valid.push({
          winery_id, name, category, price,
          description: r.description ?? null,
        });
      });
      if (!dry_run && valid.length) {
        const { error } = await supabase.from("menu_items").insert(valid);
        if (error) throw error;
        successCount = valid.length;
      } else {
        successCount = valid.length;
      }
      return json({ success: true, dry_run: !!dry_run, count: successCount, errors });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-import error:", e);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
