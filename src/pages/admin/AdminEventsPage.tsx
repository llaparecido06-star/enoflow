import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { can } from "@/lib/admin/permissions";
import { Calendar, Plus, Users as UsersIcon, Trash2, CalendarDays, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

export default function AdminEventsPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const qc = useQueryClient();
  const canManage = can(admin?.role, "events.manage");
  const [editing, setEditing] = useState<any>(null);
  const [viewingRsvps, setViewingRsvps] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["events", winery.id],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-events", { action: "list", winery_id: winery.id });
      return data?.events ?? [];
    },
  });

  const empty = { title: "", description: "", cover_url: "", starts_at: "", ends_at: "", capacity: 30, price: 0, status: "agendado" };

  const save = async () => {
    if (!editing?.title || !editing?.starts_at) return toast.error("Título e data obrigatórios");
    const { error } = await invokeAuth("admin-events", { action: "upsert", ...editing, winery_id: winery.id });
    if (error) return toast.error("Erro");
    toast.success("Salvo");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["events", winery.id] });
  };
  const del = async (id: string) => {
    if (!confirm("Excluir evento e todos RSVPs?")) return;
    await invokeAuth("admin-events", { action: "delete", id, winery_id: winery.id });
    qc.invalidateQueries({ queryKey: ["events", winery.id] });
  };

  const now = Date.now();
  const upcoming = (data ?? []).filter((e: any) => new Date(e.starts_at).getTime() >= now);
  const past = (data ?? []).filter((e: any) => new Date(e.starts_at).getTime() < now);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="admin-page-title flex items-center gap-2"><CalendarDays className="w-7 h-7 text-primary" />Eventos</h1>
          <p className="text-sm text-muted-foreground mt-1">Colheitas, harmonizações, jantares e RSVPs.</p>
        </div>
        {canManage && (
          <button onClick={() => setEditing(empty)} className="text-sm px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground inline-flex items-center gap-1.5 shadow-card hover:shadow-elevated hover:scale-[1.02] active:scale-95 transition-all font-medium"><Plus className="w-4 h-4" />Novo evento</button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="admin-kpi p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Próximos</p>
          <p className="text-2xl font-bold text-foreground mt-1">{upcoming.length}</p>
        </div>
        <div className="admin-kpi p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">RSVPs totais</p>
          <p className="text-2xl font-bold text-foreground mt-1">{(data ?? []).reduce((s: number, e: any) => s + (e.rsvp_count || 0), 0)}</p>
        </div>
        <div className="admin-kpi p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Realizados</p>
          <p className="text-2xl font-bold text-foreground mt-1">{past.length}</p>
        </div>
      </div>

      <Section title="Próximos eventos" events={upcoming} canManage={canManage} onEdit={setEditing} onDelete={del} onRsvps={setViewingRsvps} currency={winery.currency} />
      <Section title="Eventos passados" events={past} canManage={canManage} onEdit={setEditing} onDelete={del} onRsvps={setViewingRsvps} currency={winery.currency} muted />

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl p-5 max-w-lg w-full space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">{editing.id ? "Editar" : "Novo"} evento</h3>
            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Título" className="w-full rounded-lg border border-border p-2 text-sm" />
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Descrição" rows={3} className="w-full rounded-lg border border-border p-2 text-sm" />
            <input value={editing.cover_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} placeholder="URL da capa (opcional)" className="w-full rounded-lg border border-border p-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Início<input type="datetime-local" value={editing.starts_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} className="w-full rounded-lg border border-border p-2 text-sm mt-1" /></label>
              <label className="text-xs text-muted-foreground">Fim<input type="datetime-local" value={editing.ends_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} className="w-full rounded-lg border border-border p-2 text-sm mt-1" /></label>
              <label className="text-xs text-muted-foreground">Capacidade<input type="number" value={editing.capacity ?? 30} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })} className="w-full rounded-lg border border-border p-2 text-sm mt-1" /></label>
              <label className="text-xs text-muted-foreground">Preço<input type="number" step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className="w-full rounded-lg border border-border p-2 text-sm mt-1" /></label>
            </div>
            <select value={editing.status ?? "agendado"} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full rounded-lg border border-border p-2 text-sm">
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
              <option value="encerrado">Encerrado</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="text-sm px-3 py-2 rounded-lg border border-border">Cancelar</button>
              <button onClick={save} className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {viewingRsvps && <RsvpsModal event={viewingRsvps} wineryId={winery.id} onClose={() => setViewingRsvps(null)} canManage={canManage} />}
    </div>
  );
}

function Section({ title, events, canManage, onEdit, onDelete, onRsvps, currency, muted }: any) {
  if (!events.length) return null;
  const statusTint = (s: string) => {
    if (s === "confirmado") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    if (s === "cancelado") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    if (s === "encerrado") return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200";
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  };
  return (
    <div className={muted ? "opacity-80" : ""}>
      <h2 className="admin-section-title mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary/60" />{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((e: any) => (
          <div key={e.id} className="admin-card admin-card-hover overflow-hidden group">
            {e.cover_url ? (
              <div className="relative h-36 overflow-hidden">
                <img src={e.cover_url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className={`absolute top-2 right-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusTint(e.status)}`}>{e.status}</span>
              </div>
            ) : (
              <div className="h-2 bg-gradient-to-r from-primary/40 to-primary/10" />
            )}
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm flex-1 leading-snug">{e.title}</p>
                {!e.cover_url && <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${statusTint(e.status)}`}>{e.status}</span>}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(e.starts_at).toLocaleString("pt-BR")}</p>
              <p className="text-xs flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5 text-primary" /> <span className="font-medium">{e.rsvp_count}/{e.capacity}</span> · <span className="text-muted-foreground">{formatCurrency(e.price, currency)}</span></p>
              <div className="flex gap-1.5 pt-1">
                <button onClick={() => onRsvps(e)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border flex-1 hover:bg-secondary/60 transition-colors font-medium">Ver RSVPs</button>
                {canManage && <button onClick={() => onEdit(e)} className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary/60 transition-colors">Editar</button>}
                {canManage && <button onClick={() => onDelete(e.id)} className="text-xs px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RsvpsModal({ event, wineryId, onClose, canManage }: any) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["event-rsvps", event.id],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-events", { action: "list_rsvps", event_id: event.id, winery_id: wineryId });
      return data?.rsvps ?? [];
    },
  });
  const setStatus = async (id: string, status: string) => {
    await invokeAuth("admin-events", { action: "update_rsvp_status", id, status, winery_id: wineryId });
    qc.invalidateQueries({ queryKey: ["event-rsvps", event.id] });
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold mb-3">RSVPs — {event.title}</h3>
        <ul className="divide-y divide-border">
          {(data ?? []).length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Nenhum RSVP ainda.</li>}
          {(data ?? []).map((r: any) => (
            <li key={r.id} className="py-2 flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate">{r.contact_name} · {r.party_size}p</p>
                <p className="text-xs text-muted-foreground">{r.contact_whatsapp}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{r.status}</span>
              {canManage && (
                <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="text-xs rounded border border-border p-1">
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="presente">Presente</option>
                  <option value="no_show">No-show</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
