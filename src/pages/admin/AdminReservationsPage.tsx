import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { CalendarCheck, Plus, Settings as SettingsIcon, Check, X, UserCheck, Clock, Trash2 } from "lucide-react";

type View = "today" | "week" | "config";
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-300",
  confirmada: "bg-blue-100 text-blue-800 border-blue-300",
  compareceu: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelada: "bg-rose-100 text-rose-700 border-rose-300",
  noshow: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

export default function AdminReservationsPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const qc = useQueryClient();
  const canManage = admin?.role === "owner" || admin?.role === "manager" || admin?.role === "master";
  const [view, setView] = useState<View>("today");
  const [showCreate, setShowCreate] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekFromIso = useMemo(() => new Date().toISOString(), []);
  const weekToIso = useMemo(() => new Date(Date.now() + 7 * 86400 * 1000).toISOString(), []);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["reservations", winery.id, view],
    queryFn: async () => {
      const from = view === "today" ? today + "T00:00:00" : weekFromIso;
      const to = view === "today" ? today + "T23:59:59" : weekToIso;
      const { data } = await invokeAuth("admin-reservations", {
        action: "list_reservations", winery_id: winery.id, from, to,
      });
      return data?.reservations ?? [];
    },
    enabled: view !== "config",
  });

  const updateStatus = async (id: string, status: string) => {
    qc.setQueryData(["reservations", winery.id, view], (old: any[] = []) =>
      old.map((r) => (r.id === id ? { ...r, status } : r))
    );
    const { error } = await invokeAuth("admin-reservations", { action: "update_status", id, status, winery_id: winery.id });
    if (error) { toast.error("Erro"); qc.invalidateQueries({ queryKey: ["reservations", winery.id] }); }
    else toast.success("Status atualizado");
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { pendente: 0, confirmada: 0, compareceu: 0, cancelada: 0 };
    reservations.forEach((r: any) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [reservations]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="admin-page-title flex items-center gap-2"><CalendarCheck className="w-7 h-7 text-primary" />Reservas</h1>
          <p className="text-sm text-muted-foreground mt-1">{reservations.length} reserva(s) no período</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-secondary/70 rounded-xl p-1 shadow-inner">
            <TabBtn active={view === "today"} onClick={() => setView("today")} label="Hoje" />
            <TabBtn active={view === "week"} onClick={() => setView("week")} label="Semana" />
            {canManage && <TabBtn active={view === "config"} onClick={() => setView("config")} label="Slots" icon={SettingsIcon} />}
          </div>
          {view !== "config" && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-card hover:shadow-elevated hover:scale-[1.02] active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Nova reserva
            </button>
          )}
        </div>
      </div>

      {view !== "config" && reservations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="admin-kpi p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pendentes</p><p className="text-2xl font-bold mt-1 text-amber-600">{counts.pendente}</p></div>
          <div className="admin-kpi p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Confirmadas</p><p className="text-2xl font-bold mt-1 text-blue-600">{counts.confirmada}</p></div>
          <div className="admin-kpi p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Compareceram</p><p className="text-2xl font-bold mt-1 text-emerald-600">{counts.compareceu}</p></div>
          <div className="admin-kpi p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Canceladas</p><p className="text-2xl font-bold mt-1 text-rose-600">{counts.cancelada}</p></div>
        </div>
      )}

      {view === "config" ? (
        <SlotsConfig wineryId={winery.id} />
      ) : isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Carregando…</p>
      ) : reservations.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma reserva {view === "today" ? "para hoje" : "nesta semana"}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reservations.map((r: any) => (
            <ReservationCard key={r.id} r={r} onStatus={updateStatus} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateReservationModal wineryId={winery.id} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["reservations", winery.id] }); }} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label, icon: Icon }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${active ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
      {Icon && <Icon className="w-4 h-4" />} {label}
    </button>
  );
}

function ReservationCard({ r, onStatus }: { r: any; onStatus: (id: string, s: string) => void }) {
  const date = new Date(r.scheduled_at);
  return (
    <div className="admin-card admin-card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 sm:w-32">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <div>
          <div className="text-sm font-semibold">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>
          <div className="text-xs text-muted-foreground">{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">
          {r.lead?.name || r.contact_name || "—"}
          <span className="ml-2 text-xs text-muted-foreground">· {r.party_size} pessoa{r.party_size > 1 ? "s" : ""}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {r.lead?.whatsapp || r.contact_whatsapp || "—"}
          {r.assigned_admin?.name && <span className="ml-2">· {r.assigned_admin.name}</span>}
        </div>
        {r.notes && <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{r.notes}</p>}
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLORS[r.status] || ""}`}>{r.status}</span>
      <div className="flex gap-1">
        {r.status !== "confirmada" && r.status !== "compareceu" && (
          <ActionBtn icon={Check} title="Confirmar" onClick={() => onStatus(r.id, "confirmada")} tone="blue" />
        )}
        {r.status !== "compareceu" && (
          <ActionBtn icon={UserCheck} title="Compareceu" onClick={() => onStatus(r.id, "compareceu")} tone="emerald" />
        )}
        {r.status !== "cancelada" && (
          <ActionBtn icon={X} title="Cancelar" onClick={() => onStatus(r.id, "cancelada")} tone="rose" />
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, title, onClick, tone }: any) {
  const colors: Record<string, string> = {
    blue: "border-blue-300 text-blue-700 hover:bg-blue-50",
    emerald: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
    rose: "border-rose-300 text-rose-700 hover:bg-rose-50",
  };
  return (
    <button title={title} onClick={onClick} className={`p-1.5 border rounded-lg ${colors[tone]}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function CreateReservationModal({ wineryId, onClose, onCreated }: { wineryId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("14:00");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !whatsapp.trim()) { toast.error("Nome e WhatsApp obrigatórios"); return; }
    setSaving(true);
    const scheduled_at = new Date(`${date}T${time}`).toISOString();
    const { error } = await invokeAuth("admin-reservations", {
      action: "create_reservation", winery_id: wineryId,
      contact_name: name, contact_whatsapp: whatsapp, scheduled_at, party_size: partySize, notes,
    });
    setSaving(false);
    if (error) toast.error("Erro ao criar"); else { toast.success("Reserva criada"); onCreated(); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold">Nova reserva</h3>
        <Input label="Nome" value={name} onChange={setName} />
        <Input label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="(51) 9..." />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Data" type="date" value={date} onChange={setDate} />
          <Input label="Hora" type="time" value={time} onChange={setTime} />
        </div>
        <Input label="Nº de pessoas" type="number" value={String(partySize)} onChange={(v) => setPartySize(Number(v) || 1)} />
        <Input label="Observações" value={notes} onChange={setNotes} textarea />
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm disabled:opacity-50">{saving ? "Salvando…" : "Criar"}</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", textarea, placeholder }: any) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase block mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
      )}
    </div>
  );
}

function SlotsConfig({ wineryId }: { wineryId: string }) {
  const qc = useQueryClient();
  const { data: slots = [] } = useQuery({
    queryKey: ["slots", wineryId],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-reservations", { action: "list_slots", winery_id: wineryId });
      return data?.slots ?? [];
    },
  });
  const [newSlot, setNewSlot] = useState({ weekday: 1, start_time: "10:00", end_time: "11:00", capacity: 10, price: 0 });
  const [saving, setSaving] = useState(false);

  const addSlot = async () => {
    setSaving(true);
    const { error } = await invokeAuth("admin-reservations", { action: "upsert_slot", winery_id: wineryId, ...newSlot, active: true });
    setSaving(false);
    if (error) toast.error("Erro"); else { toast.success("Slot adicionado"); qc.invalidateQueries({ queryKey: ["slots", wineryId] }); }
  };

  const removeSlot = async (id: string) => {
    if (!confirm("Remover este slot?")) return;
    const { error } = await invokeAuth("admin-reservations", { action: "delete_slot", id, winery_id: wineryId });
    if (error) toast.error("Erro"); else qc.invalidateQueries({ queryKey: ["slots", wineryId] });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold">Adicionar slot recorrente</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase block mb-1">Dia</label>
            <select value={newSlot.weekday} onChange={(e) => setNewSlot({ ...newSlot, weekday: Number(e.target.value) })} className="w-full border border-border rounded-lg px-2 py-2 text-sm bg-background">
              {WEEKDAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <Input label="Início" type="time" value={newSlot.start_time} onChange={(v: string) => setNewSlot({ ...newSlot, start_time: v })} />
          <Input label="Fim" type="time" value={newSlot.end_time} onChange={(v: string) => setNewSlot({ ...newSlot, end_time: v })} />
          <Input label="Capacidade" type="number" value={String(newSlot.capacity)} onChange={(v: string) => setNewSlot({ ...newSlot, capacity: Number(v) || 1 })} />
          <Input label="Preço" type="number" value={String(newSlot.price)} onChange={(v: string) => setNewSlot({ ...newSlot, price: Number(v) || 0 })} />
        </div>
        <button onClick={addSlot} disabled={saving} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm disabled:opacity-50">Adicionar</button>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {slots.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum slot configurado.</p>
        ) : slots.map((s: any) => (
          <div key={s.id} className="flex items-center gap-3 p-3">
            <span className="w-12 text-xs font-medium text-muted-foreground">{WEEKDAY_LABELS[s.weekday]}</span>
            <span className="text-sm">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</span>
            <span className="text-xs text-muted-foreground">Cap: {s.capacity}</span>
            {s.price > 0 && <span className="text-xs text-muted-foreground">· R$ {s.price}</span>}
            <button onClick={() => removeSlot(s.id)} className="ml-auto p-1.5 text-rose-600 hover:bg-rose-50 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
