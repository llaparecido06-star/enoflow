import { verifySession, json, corsHeaders, createSupabaseAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.type !== "master") {
      return json({ error: "Acesso restrito a Master Admin" }, 401);
    }
    const supabase = createSupabaseAdmin();

    // Re-validate role
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("id", session.sub)
      .single();
    if (!admin || admin.role !== "master") {
      return json({ error: "Acesso restrito a Master Admin" }, 403);
    }

    const body = await req.json();
    const { action } = body;

    if (action === "list_wineries") {
      const { data, error } = await supabase.from("wineries").select("id, name, slug").order("name");
      if (error) throw error;
      return json({ success: true, wineries: data ?? [] });
    }

    // ── CLIENTS ──────────────────────────────
    if (action === "list_clients") {
      const { data, error } = await supabase
        .from("b2b_clients")
        .select("*, winery:wineries(id,name,slug)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, clients: data ?? [] });
    }

    if (action === "get_client") {
      const { client_id } = body;
      if (!client_id) return json({ error: "client_id required" }, 400);
      const [clientRes, contractsRes] = await Promise.all([
        supabase.from("b2b_clients").select("*, winery:wineries(id,name,slug)").eq("id", client_id).single(),
        supabase.from("b2b_contracts").select("*").eq("client_id", client_id).order("created_at", { ascending: false }),
      ]);
      if (clientRes.error) throw clientRes.error;
      const contractIds = (contractsRes.data ?? []).map((c: any) => c.id);
      let invoices: any[] = [];
      if (contractIds.length > 0) {
        const { data: invs } = await supabase
          .from("b2b_invoices")
          .select("*")
          .in("contract_id", contractIds)
          .order("due_date", { ascending: true });
        invoices = invs ?? [];
      }
      return json({
        success: true,
        client: clientRes.data,
        contracts: contractsRes.data ?? [],
        invoices,
      });
    }

    if (action === "upsert_client") {
      const { id, ...fields } = body.client ?? {};
      const payload: any = {
        winery_id: fields.winery_id || null,
        legal_name: String(fields.legal_name || "").slice(0, 200),
        trade_name: fields.trade_name ? String(fields.trade_name).slice(0, 200) : null,
        cnpj: String(fields.cnpj || "").slice(0, 30),
        address: fields.address ? String(fields.address).slice(0, 300) : null,
        city: fields.city ? String(fields.city).slice(0, 100) : null,
        state: fields.state ? String(fields.state).slice(0, 50) : null,
        zip_code: fields.zip_code ? String(fields.zip_code).slice(0, 20) : null,
        responsible_name: fields.responsible_name ? String(fields.responsible_name).slice(0, 150) : null,
        responsible_cpf: fields.responsible_cpf ? String(fields.responsible_cpf).slice(0, 20) : null,
        responsible_role: fields.responsible_role ? String(fields.responsible_role).slice(0, 100) : null,
        responsible_email: fields.responsible_email ? String(fields.responsible_email).slice(0, 200) : null,
        responsible_phone: fields.responsible_phone ? String(fields.responsible_phone).slice(0, 30) : null,
        notes: fields.notes ? String(fields.notes).slice(0, 2000) : null,
      };
      if (!payload.legal_name || !payload.cnpj) return json({ error: "legal_name e cnpj são obrigatórios" }, 400);
      const q = id
        ? supabase.from("b2b_clients").update(payload).eq("id", id).select().single()
        : supabase.from("b2b_clients").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      return json({ success: true, client: data });
    }

    if (action === "delete_client") {
      const { client_id } = body;
      if (!client_id) return json({ error: "client_id required" }, 400);
      const { error } = await supabase.from("b2b_clients").delete().eq("id", client_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── CONTRACTS ────────────────────────────
    if (action === "upsert_contract") {
      const { id, ...fields } = body.contract ?? {};
      const payload: any = {
        client_id: fields.client_id,
        plan_name: String(fields.plan_name || "Plano Base").slice(0, 100),
        setup_fee: Number(fields.setup_fee) || 0,
        monthly_fee: Number(fields.monthly_fee) || 0,
        postsales_active: Boolean(fields.postsales_active),
        postsales_commission_pct: Number(fields.postsales_commission_pct) || 0,
        start_date: fields.start_date || null,
        end_date: fields.end_date || null,
        status: ["draft","active","ended","cancelled"].includes(fields.status) ? fields.status : "draft",
        notes: fields.notes ? String(fields.notes).slice(0, 2000) : null,
      };
      if (!payload.client_id) return json({ error: "client_id required" }, 400);
      const q = id
        ? supabase.from("b2b_contracts").update(payload).eq("id", id).select().single()
        : supabase.from("b2b_contracts").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      return json({ success: true, contract: data });
    }

    if (action === "delete_contract") {
      const { contract_id } = body;
      if (!contract_id) return json({ error: "contract_id required" }, 400);
      const { error } = await supabase.from("b2b_contracts").delete().eq("id", contract_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── INVOICES ─────────────────────────────
    if (action === "upsert_invoice") {
      const { id, ...fields } = body.invoice ?? {};
      const payload: any = {
        contract_id: fields.contract_id,
        description: String(fields.description || "").slice(0, 200),
        amount: Number(fields.amount) || 0,
        due_date: fields.due_date,
        paid_at: fields.paid_at || null,
        status: ["pending","paid","overdue","cancelled"].includes(fields.status) ? fields.status : "pending",
        payment_link: fields.payment_link ? String(fields.payment_link).slice(0, 500) : null,
        notes: fields.notes ? String(fields.notes).slice(0, 1000) : null,
      };
      if (!payload.contract_id || !payload.due_date || !payload.description) {
        return json({ error: "contract_id, description e due_date obrigatórios" }, 400);
      }
      const q = id
        ? supabase.from("b2b_invoices").update(payload).eq("id", id).select().single()
        : supabase.from("b2b_invoices").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      return json({ success: true, invoice: data });
    }

    if (action === "delete_invoice") {
      const { invoice_id } = body;
      if (!invoice_id) return json({ error: "invoice_id required" }, 400);
      const { error } = await supabase.from("b2b_invoices").delete().eq("id", invoice_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err: any) {
    console.error("master-clients error", err);
    return json({ error: err?.message ?? "Erro interno" }, 500);
  }
});
