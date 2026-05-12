import { createSupabaseAdmin } from "./auth.ts";

/**
 * Fire-and-forget audit logger. Never throws — failures shouldn't break the action.
 */
export async function logAudit(params: {
  winery_id: string;
  admin_id?: string;
  admin_name?: string;
  entity: string;
  entity_id?: string;
  action: string;
  before?: any;
  after?: any;
  metadata?: any;
}) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("audit_logs").insert({
      winery_id: params.winery_id,
      admin_id: params.admin_id ?? null,
      admin_name: params.admin_name ?? null,
      entity: params.entity,
      entity_id: params.entity_id ?? null,
      action: params.action,
      before: params.before ?? null,
      after: params.after ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}
