import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { Boxes, Plus, Minus, AlertTriangle, History, Wine as WineIcon, Search } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ok: { label: "OK", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  low: { label: "Baixo", color: "bg-amber-100 text-amber-700 border-amber-300" },
  out: { label: "Esgotado", color: "bg-rose-100 text-rose-700 border-rose-300" },
  off: { label: "Sem controle", color: "bg-zinc-100 text-zinc-600 border-zinc-300" },
};

function statusOf(w: any): string {
  if (!w.track_stock) return "off";
  if (w.stock_qty <= 0) return "out";
  if (w.stock_qty <= w.stock_min) return "low";
  return "ok";
}

export default function AdminStockPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const qc = useQueryClient();
  const canManage = admin?.role === "owner" || admin?.role === "manager" || admin?.role === "master";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "tracked" | "low" | "out">("all");
  const [historyWine, setHistoryWine] = useState<any>(null);
  const [adjusting, setAdjusting] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["stock", winery.id, filter],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-stock", {
        action: "list_stock", winery_id: winery.id,
        only_tracked: filter === "tracked" || filter === "low" || filter === "out",
        status: filter === "low" ? "low" : filter === "out" ? "out" : undefined,
      });
      return data ?? { wines: [], summary: {} };
    },
  });

  const wines = (data?.wines ?? []).filter((w: any) => !search || w.name.toLowerCase().includes(search.toLowerCase()));
  const summary = data?.summary || { total: 0, out_of_stock: 0, low_stock: 0 };

  const toggleTracking = async (wine: any) => {
    if (!canManage) return;
    const { error } = await invokeAuth("admin-stock", { action: "set_tracking", wine_id: wine.id, track_stock: !wine.track_stock, winery_id: winery.id });
    if (error) toast.error("Erro"); else qc.invalidateQueries({ queryKey: ["stock", winery.id] });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Boxes className="w-6 h-6 text-primary" /> Estoque
          </h1>
          <p className="text-sm text-muted-foreground">
            {summary.total} vinho(s)
            {summary.out_of_stock > 0 && <span className="ml-2 text-rose-600 font-medium">⚠ {summary.out_of_stock} esgotado(s)</span>}
            {summary.low_stock > 0 && <span className="ml-2 text-amber-600">⚠ {summary.low_stock} baixo(s)</span>}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vinho…" className="pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background w-full" />
        </div>
        <div className="flex bg-secondary rounded-lg p-0.5">
          {(["all", "tracked", "low", "out"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs ${filter === f ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {f === "all" ? "Todos" : f === "tracked" ? "Com controle" : f === "low" ? "Baixos" : "Esgotados"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Carregando…</p>
      ) : wines.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Boxes className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum vinho encontrado.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {wines.map((w: any) => {
            const s = statusOf(w);
            return (
              <div key={w.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {w.image_url ? <img src={w.image_url} alt="" className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center"><WineIcon className="w-4 h-4 text-muted-foreground" /></div>}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.type} {w.year ? `· ${w.year}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[60px]">
                    <div className="text-lg font-bold tabular-nums">{w.track_stock ? w.stock_qty : "—"}</div>
                    <div className="text-[10px] text-muted-foreground">qty · min {w.stock_min}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_LABEL[s].color}`}>{STATUS_LABEL[s].label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {w.track_stock && (
                    <>
                      <button title="Baixa" onClick={() => setAdjusting({ wine: w, delta: -1 })} className="p-1.5 border border-border rounded-lg hover:bg-secondary"><Minus className="w-3.5 h-3.5" /></button>
                      <button title="Entrada" onClick={() => setAdjusting({ wine: w, delta: 1 })} className="p-1.5 border border-border rounded-lg hover:bg-secondary"><Plus className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                  <button title="Histórico" onClick={() => setHistoryWine(w)} className="p-1.5 border border-border rounded-lg hover:bg-secondary"><History className="w-3.5 h-3.5" /></button>
                  {canManage && (
                    <button onClick={() => toggleTracking(w)} className={`text-xs px-2 py-1 rounded-lg border ${w.track_stock ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                      {w.track_stock ? "Controlado" : "Ativar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adjusting && (
        <AdjustModal
          wineryId={winery.id}
          wine={adjusting.wine}
          initialDelta={adjusting.delta}
          onClose={() => setAdjusting(null)}
          onSaved={() => { setAdjusting(null); qc.invalidateQueries({ queryKey: ["stock", winery.id] }); }}
        />
      )}
      {historyWine && (
        <HistoryModal wineryId={winery.id} wine={historyWine} onClose={() => setHistoryWine(null)} />
      )}
    </div>
  );
}

function AdjustModal({ wineryId, wine, initialDelta, onClose, onSaved }: any) {
  const [qty, setQty] = useState(Math.abs(initialDelta));
  const [direction, setDirection] = useState<"in" | "out">(initialDelta > 0 ? "in" : "out");
  const [reason, setReason] = useState(initialDelta > 0 ? "entrada" : "ajuste");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const delta = direction === "in" ? Number(qty) : -Number(qty);
    const { error } = await invokeAuth("admin-stock", { action: "adjust", wine_id: wine.id, delta, reason, note, winery_id: wineryId });
    setSaving(false);
    if (error) toast.error("Erro"); else { toast.success(`Estoque ajustado (${delta > 0 ? "+" : ""}${delta})`); onSaved(); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold">{wine.name}</h3>
        <p className="text-xs text-muted-foreground">Estoque atual: {wine.stock_qty}</p>
        <div className="flex bg-secondary rounded-lg p-0.5">
          <button onClick={() => setDirection("in")} className={`flex-1 py-2 text-sm rounded-md ${direction === "in" ? "bg-card shadow-sm" : ""}`}>+ Entrada</button>
          <button onClick={() => setDirection("out")} className={`flex-1 py-2 text-sm rounded-md ${direction === "out" ? "bg-card shadow-sm" : ""}`}>− Baixa</button>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Quantidade</label>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 0)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Motivo</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="entrada">Entrada/Compra</option>
            <option value="venda">Venda manual</option>
            <option value="ajuste">Ajuste de inventário</option>
            <option value="perda">Perda/Quebra</option>
            <option value="devolucao">Devolução</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Observação</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 border border-border rounded-lg py-2 text-sm">Cancelar</button>
          <button onClick={save} disabled={saving || qty <= 0} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm disabled:opacity-50">{saving ? "Salvando…" : "Confirmar"}</button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ wineryId, wine, onClose }: any) {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["movements", wineryId, wine.id],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-stock", { action: "movements", wine_id: wine.id, winery_id: wineryId });
      return data?.movements ?? [];
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border max-w-lg w-full p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold mb-1">Histórico — {wine.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">{movements.length} movimento(s)</p>
        {isLoading ? <p className="text-sm text-muted-foreground text-center py-6">Carregando…</p> :
         movements.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sem movimentos.</p> :
         <div className="divide-y divide-border">
           {movements.map((m: any) => (
             <div key={m.id} className="py-2 flex items-center gap-3">
               <span className={`text-sm font-bold tabular-nums w-12 text-right ${m.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
               <div className="flex-1 min-w-0">
                 <div className="text-xs font-medium">{m.reason}</div>
                 <div className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")} {m.admin_name ? `· ${m.admin_name}` : ""}</div>
                 {m.note && <div className="text-[10px] text-muted-foreground/80 truncate">{m.note}</div>}
               </div>
             </div>
           ))}
         </div>
        }
      </div>
    </div>
  );
}
