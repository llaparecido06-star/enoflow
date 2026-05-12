import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { can } from "@/lib/admin/permissions";
import { Gift, Crown, Settings as SettingsIcon, Inbox, Plus, Trash2 } from "lucide-react";

export default function AdminLoyaltyPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const qc = useQueryClient();
  const canManage = can(admin?.role, "loyalty.manage");
  const [tab, setTab] = useState<"rewards" | "tiers" | "rules" | "redemptions">("rewards");

  const { data } = useQuery({
    queryKey: ["loyalty", winery.id],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-loyalty", { action: "list", winery_id: winery.id });
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["loyalty", winery.id] });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Programa de Fidelidade</h1>
        <p className="text-sm text-muted-foreground mt-1">Recompensas, níveis e regras de pontuação.</p>
      </div>

      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <TabBtn active={tab === "rewards"} onClick={() => setTab("rewards")} label="Recompensas" icon={Gift} />
        <TabBtn active={tab === "tiers"} onClick={() => setTab("tiers")} label="Níveis" icon={Crown} />
        <TabBtn active={tab === "rules"} onClick={() => setTab("rules")} label="Regras" icon={SettingsIcon} />
        <TabBtn active={tab === "redemptions"} onClick={() => setTab("redemptions")} label={`Resgates${(data?.redemptions?.filter((r: any) => r.status === "pendente").length ?? 0) > 0 ? ` (${data.redemptions.filter((r: any) => r.status === "pendente").length})` : ""}`} icon={Inbox} />
      </div>

      {tab === "rewards" && <RewardsTab rewards={data?.rewards ?? []} canManage={canManage} wineryId={winery.id} onChange={invalidate} />}
      {tab === "tiers" && <TiersTab tiers={data?.tiers ?? []} canManage={canManage} wineryId={winery.id} onChange={invalidate} />}
      {tab === "rules" && <RulesTab rules={data?.rules ?? {}} canManage={canManage} wineryId={winery.id} onChange={invalidate} />}
      {tab === "redemptions" && <RedemptionsTab redemptions={data?.redemptions ?? []} canManage={canManage} wineryId={winery.id} onChange={invalidate} />}
    </div>
  );
}

function TabBtn({ active, onClick, label, icon: Icon }: any) {
  return <button onClick={onClick} className={`px-3 py-2 text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${active ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground"}`}><Icon className="w-4 h-4" />{label}</button>;
}

function RewardsTab({ rewards, canManage, wineryId, onChange }: any) {
  const [editing, setEditing] = useState<any>(null);
  const empty = { title: "", description: "", points_cost: 100, threshold: 100, category: "", image_url: "", active: true };

  const save = async () => {
    if (!editing?.title) return toast.error("Título obrigatório");
    const { error } = await invokeAuth("admin-loyalty", { action: "upsert_reward", ...editing, winery_id: wineryId });
    if (error) return toast.error("Erro ao salvar");
    toast.success("Salvo");
    setEditing(null);
    onChange();
  };
  const del = async (id: string) => {
    if (!confirm("Excluir recompensa?")) return;
    await invokeAuth("admin-loyalty", { action: "delete_reward", id, winery_id: wineryId });
    onChange();
  };

  return (
    <div className="space-y-3">
      {canManage && <button onClick={() => setEditing(empty)} className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-1"><Plus className="w-4 h-4" />Nova recompensa</button>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rewards.map((r: any) => (
          <div key={r.id} className="rounded-xl bg-card border border-border p-3 flex gap-3">
            {r.image_url ? <img src={r.image_url} className="w-14 h-14 rounded-md object-cover" /> : <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center"><Gift className="w-6 h-6 text-muted-foreground" /></div>}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{r.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
              <p className="text-xs mt-1"><span className="font-semibold text-primary">{r.points_cost ?? r.threshold} pts</span>{r.category && <span className="text-muted-foreground"> · {r.category}</span>}{!r.active && <span className="ml-1 text-rose-500">(inativa)</span>}</p>
            </div>
            {canManage && (
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(r)} className="text-xs px-2 py-1 rounded border border-border">Editar</button>
                <button onClick={() => del(r.id)} className="text-xs px-2 py-1 rounded text-rose-600"><Trash2 className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        ))}
        {rewards.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhuma recompensa cadastrada.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">{editing.id ? "Editar" : "Nova"} recompensa</h3>
            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Título" className="w-full rounded-lg border border-border p-2 text-sm" />
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Descrição" rows={3} className="w-full rounded-lg border border-border p-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={editing.points_cost ?? 0} onChange={(e) => setEditing({ ...editing, points_cost: Number(e.target.value), threshold: Number(e.target.value) })} placeholder="Pontos" className="rounded-lg border border-border p-2 text-sm" />
              <input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Categoria" className="rounded-lg border border-border p-2 text-sm" />
            </div>
            <input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="URL imagem (opcional)" className="w-full rounded-lg border border-border p-2 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />Ativa</label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="text-sm px-3 py-2 rounded-lg border border-border">Cancelar</button>
              <button onClick={save} className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TiersTab({ tiers, canManage, wineryId, onChange }: any) {
  const [editing, setEditing] = useState<any>(null);
  const empty = { name: "", min_points: 0, color: "#9CA3AF", perks: [], position: tiers.length };
  const save = async () => {
    if (!editing?.name) return toast.error("Nome obrigatório");
    const { error } = await invokeAuth("admin-loyalty", { action: "upsert_tier", ...editing, winery_id: wineryId });
    if (error) return toast.error("Erro");
    toast.success("Salvo");
    setEditing(null);
    onChange();
  };
  const del = async (id: string) => {
    if (!confirm("Excluir nível?")) return;
    await invokeAuth("admin-loyalty", { action: "delete_tier", id, winery_id: wineryId });
    onChange();
  };

  return (
    <div className="space-y-3">
      {canManage && <button onClick={() => setEditing(empty)} className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-1"><Plus className="w-4 h-4" />Novo nível</button>}
      <div className="space-y-2">
        {tiers.sort((a: any, b: any) => a.min_points - b.min_points).map((t: any) => (
          <div key={t.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
            <div className="w-3 h-10 rounded" style={{ backgroundColor: t.color }} />
            <div className="flex-1">
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">A partir de {t.min_points} pts</p>
            </div>
            {canManage && (
              <>
                <button onClick={() => setEditing(t)} className="text-xs px-2 py-1 rounded border border-border">Editar</button>
                <button onClick={() => del(t.id)} className="text-xs px-2 py-1 text-rose-600"><Trash2 className="w-3 h-3" /></button>
              </>
            )}
          </div>
        ))}
        {tiers.length === 0 && <p className="text-sm text-muted-foreground">Nenhum nível cadastrado.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">{editing.id ? "Editar" : "Novo"} nível</h3>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Nome (Bronze, Prata, Ouro)" className="w-full rounded-lg border border-border p-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={editing.min_points} onChange={(e) => setEditing({ ...editing, min_points: Number(e.target.value) })} placeholder="Pontos mín." className="rounded-lg border border-border p-2 text-sm" />
              <input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="rounded-lg border border-border h-10 w-full" />
            </div>
            <textarea value={(editing.perks ?? []).join("\n")} onChange={(e) => setEditing({ ...editing, perks: e.target.value.split("\n").filter(Boolean) })} placeholder="Benefícios (1 por linha)" rows={3} className="w-full rounded-lg border border-border p-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="text-sm px-3 py-2 rounded-lg border border-border">Cancelar</button>
              <button onClick={save} className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RulesTab({ rules, canManage, wineryId, onChange }: any) {
  const [form, setForm] = useState(rules ?? { points_per_currency: 1, points_per_visit: 50, points_per_referral: 100 });
  const save = async () => {
    const { error } = await invokeAuth("admin-loyalty", { action: "update_rules", rules: form, winery_id: wineryId });
    if (error) return toast.error("Erro");
    toast.success("Regras atualizadas");
    onChange();
  };
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3 max-w-md">
      <Field label="Pontos por moeda gasta (R$1 =)" value={form.points_per_currency} onChange={(v) => setForm({ ...form, points_per_currency: v })} disabled={!canManage} />
      <Field label="Pontos por visita (check-in)" value={form.points_per_visit} onChange={(v) => setForm({ ...form, points_per_visit: v })} disabled={!canManage} />
      <Field label="Pontos por indicação" value={form.points_per_referral} onChange={(v) => setForm({ ...form, points_per_referral: v })} disabled={!canManage} />
      {canManage && <button onClick={save} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground">Salvar regras</button>}
    </div>
  );
}
function Field({ label, value, onChange, disabled }: any) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input type="number" value={value ?? 0} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-lg border border-border p-2 text-sm mt-1" />
    </div>
  );
}

function RedemptionsTab({ redemptions, canManage, wineryId, onChange }: any) {
  const setStatus = async (id: string, status: string) => {
    await invokeAuth("admin-loyalty", { action: "approve_redemption", id, status, winery_id: wineryId });
    toast.success("Atualizado");
    onChange();
  };
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <ul className="divide-y divide-border">
        {redemptions.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum resgate solicitado.</li>}
        {redemptions.map((r: any) => (
          <li key={r.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.user_name ?? "—"} · <span className="text-muted-foreground">{r.reward_title}</span></p>
              <p className="text-xs text-muted-foreground">{r.points_spent} pts · {new Date(r.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "entregue" ? "bg-emerald-100 text-emerald-700" : r.status === "recusado" ? "bg-rose-100 text-rose-700" : r.status === "aprovado" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"}`}>{r.status}</span>
            {canManage && r.status === "pendente" && (
              <div className="flex gap-1">
                <button onClick={() => setStatus(r.id, "aprovado")} className="text-xs px-2 py-1 rounded bg-amber-500 text-white">Aprovar</button>
                <button onClick={() => setStatus(r.id, "recusado")} className="text-xs px-2 py-1 rounded border border-border">Recusar</button>
              </div>
            )}
            {canManage && r.status === "aprovado" && (
              <button onClick={() => setStatus(r.id, "entregue")} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white">Entregue</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
