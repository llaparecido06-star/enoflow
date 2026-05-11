import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { Users, GripVertical, Plus, X, ToggleLeft, ToggleRight, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface QueueMember {
  admin_id: string;
  admin_name: string;
  admin_role: string;
  position: number;
  active: boolean;
  open_leads: number;
}

interface Staff { id: string; name: string; role: string }

interface Props { wineryId: string }

export default function AssignmentQueueSettings({ wineryId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"round_robin" | "load_balanced">("round_robin");
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: q }, { data: s }] = await Promise.all([
      invokeAuth("admin-crm", { action: "get_queue", winery_id: wineryId }),
      invokeAuth("admin-crm", { action: "list_staff", winery_id: wineryId }),
    ]);
    if (q?.success) {
      setEnabled(!!q.queue?.enabled);
      setMode(q.queue?.mode || "round_robin");
      setMembers(q.members ?? []);
    }
    setStaff((s?.staff ?? []).filter((u: Staff) => u.role !== "master"));
    setLoading(false);
  };

  useEffect(() => { load(); }, [wineryId]);

  const toggleEnabled = async () => {
    const next = !enabled;
    setEnabled(next);
    await invokeAuth("admin-crm", { action: "set_queue", enabled: next, winery_id: wineryId });
    toast.success(next ? "Distribuição automática ativada" : "Distribuição desativada");
  };

  const changeMode = async (m: "round_robin" | "load_balanced") => {
    setMode(m);
    await invokeAuth("admin-crm", { action: "set_queue", mode: m, winery_id: wineryId });
  };

  const addMember = async () => {
    if (!adding) return;
    if (members.some((m) => m.admin_id === adding)) {
      toast.error("Já está na fila");
      return;
    }
    await invokeAuth("admin-crm", { action: "queue_add_member", admin_id: adding, winery_id: wineryId });
    setAdding("");
    load();
  };

  const removeMember = async (admin_id: string) => {
    await invokeAuth("admin-crm", { action: "queue_remove_member", admin_id, winery_id: wineryId });
    load();
  };

  const toggleMember = async (admin_id: string, active: boolean) => {
    await invokeAuth("admin-crm", { action: "queue_toggle_member", admin_id, active: !active, winery_id: wineryId });
    load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...members];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setMembers(next);
    await invokeAuth("admin-crm", { action: "queue_reorder", order: next.map((m) => m.admin_id), winery_id: wineryId });
  };

  const activeMembers = members.filter((m) => m.active);
  const nextPick = !enabled || activeMembers.length === 0 ? null
    : mode === "load_balanced"
      ? activeMembers.slice().sort((a, b) => a.open_leads - b.open_leads)[0]
      : activeMembers[0];

  const available = staff.filter((s) => !members.some((m) => m.admin_id === s.id));

  if (loading) return <p className="text-center text-sm text-muted-foreground py-8">Carregando…</p>;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-secondary/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Distribuição automática de leads
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Quando um novo lead chega via QR code, ele é atribuído automaticamente ao próximo atendente da fila.
            </p>
          </div>
          <button
            onClick={toggleEnabled}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium ${
              enabled ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"
            }`}
          >
            {enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {enabled ? "Ativa" : "Desativada"}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">Modo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => changeMode("round_robin")}
              className={`text-left p-3 rounded-lg border transition-colors ${
                mode === "round_robin" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40"
              }`}
            >
              <p className="text-sm font-medium">Round-robin</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Distribui em ordem na fila.</p>
            </button>
            <button
              onClick={() => changeMode("load_balanced")}
              className={`text-left p-3 rounded-lg border transition-colors ${
                mode === "load_balanced" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40"
              }`}
            >
              <p className="text-sm font-medium">Carga balanceada</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Quem tiver menos leads abertos recebe primeiro.</p>
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Membros da fila ({members.length})</label>
            {nextPick && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Próximo lead → <span className="font-semibold">{nextPick.admin_name}</span>
              </span>
            )}
          </div>

          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              Nenhum atendente na fila. Adicione abaixo.
            </p>
          ) : (
            <div className="space-y-1.5">
              {members.map((m, idx) => (
                <div
                  key={m.admin_id}
                  className={`flex items-center gap-2 p-2 border rounded-lg ${m.active ? "border-border bg-background" : "border-border bg-secondary/30 opacity-60"}`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => move(idx, 1)} disabled={idx === members.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.admin_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.admin_role} · {m.open_leads} lead{m.open_leads !== 1 ? "s" : ""} aberto{m.open_leads !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleMember(m.admin_id, m.active)}
                    className={`text-[10px] px-2 py-1 rounded ${m.active ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"}`}
                  >
                    {m.active ? "Ativo" : "Pausado"}
                  </button>
                  <button onClick={() => removeMember(m.admin_id)} className="text-muted-foreground hover:text-destructive p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {available.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <select value={adding} onChange={(e) => setAdding(e.target.value)} className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background">
              <option value="">Selecione um atendente…</option>
              {available.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
            </select>
            <button onClick={addMember} disabled={!adding} className="flex items-center gap-1 bg-primary text-primary-foreground text-sm px-3 py-2 rounded-lg disabled:opacity-50">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground bg-secondary/40 p-2 rounded">
          💡 Quando um lead é atribuído manualmente, ele sai da rotação automática para evitar duplicação.
        </p>
      </div>
    </div>
  );
}
