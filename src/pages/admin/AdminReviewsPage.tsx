import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { can } from "@/lib/admin/permissions";
import { Star, MessageSquare, AlertTriangle, Smile, Frown, Meh, EyeOff, Eye, History, ChevronDown, ChevronRight } from "lucide-react";

export default function AdminReviewsPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const qc = useQueryClient();
  const canRespond = can(admin?.role, "reviews.respond");
  const [tab, setTab] = useState<"wines" | "nps">("wines");
  const [responding, setResponding] = useState<any>(null);
  const [responseText, setResponseText] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Filters
  const [wineFilter, setWineFilter] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");

  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", winery.id, wineFilter, visibilityFilter],
    queryFn: async () => {
      const params: any = { action: "list_wine_reviews", winery_id: winery.id };
      if (wineFilter) params.wine_id = wineFilter;
      if (visibilityFilter === "hidden") params.hidden = true;
      if (visibilityFilter === "visible") params.hidden = false;
      const { data } = await invokeAuth("admin-reviews", params);
      return data ?? { reviews: [] };
    },
  });
  const { data: summary } = useQuery({
    queryKey: ["reviews-summary", winery.id],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-reviews", { action: "wine_summary", winery_id: winery.id });
      return data?.summary ?? [];
    },
  });
  const { data: nps } = useQuery({
    queryKey: ["nps", winery.id],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-reviews", { action: "nps_summary", winery_id: winery.id });
      return data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["reviews-moderation-history", winery.id, historyOpen],
    queryFn: async () => {
      const { data } = await invokeAuth("admin-reviews", { action: "moderation_history", winery_id: winery.id, limit: 100 });
      return data?.history ?? [];
    },
    enabled: historyOpen,
  });

  const allReviews = reviewsData?.reviews ?? [];
  const reviews = useMemo(() => {
    if (!userSearch.trim()) return allReviews;
    const q = userSearch.toLowerCase();
    return allReviews.filter((r: any) =>
      (r.user_name ?? "").toLowerCase().includes(q) ||
      (r.comment ?? "").toLowerCase().includes(q)
    );
  }, [allReviews, userSearch]);
  const lowScoreCount = reviews.filter((r: any) => r.stars <= 2).length;

  const submitResponse = async () => {
    if (!responding || !responseText.trim()) return;
    const { error } = await invokeAuth("admin-reviews", { action: "respond", review_id: responding.id, response: responseText, winery_id: winery.id });
    if (error) return toast.error("Erro ao responder");
    toast.success("Resposta publicada");
    setResponding(null);
    setResponseText("");
    qc.invalidateQueries({ queryKey: ["reviews", winery.id] });
  };

  const toggleHidden = async (review: any) => {
    const next = !review.is_hidden;
    const { data, error } = await invokeAuth("admin-reviews", {
      action: "set_hidden",
      review_id: review.id,
      hidden: next,
      winery_id: winery.id,
    });
    if (error || data?.error) return toast.error("Não foi possível atualizar a visibilidade");
    toast.success(next ? "Avaliação ocultada" : "Avaliação reexibida");
    qc.invalidateQueries({ queryKey: ["reviews", winery.id] });
    qc.invalidateQueries({ queryKey: ["reviews-moderation-history", winery.id] });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Avaliações & NPS</h1>
        <p className="text-sm text-muted-foreground mt-1">Reviews dos vinhos e indicador de satisfação da visita.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Smile} label="NPS" value={nps?.nps ?? 0} suffix="" tint="emerald" />
        <KpiCard icon={Star} label="Avaliações" value={reviews.length} tint="amber" />
        <KpiCard icon={MessageSquare} label="Promotores" value={nps?.promoters ?? 0} tint="emerald" />
        <KpiCard icon={AlertTriangle} label="Alertas (≤2★)" value={lowScoreCount} tint="rose" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <TabBtn active={tab === "wines"} onClick={() => setTab("wines")} label="Vinhos" />
        <TabBtn active={tab === "nps"} onClick={() => setTab("nps")} label="Visita / NPS" />
      </div>

      {tab === "wines" && (
        <div className="space-y-4">
          {(summary ?? []).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(summary ?? []).slice(0, 6).map((s: any) => (
                <div key={s.wine_id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
                  {s.image_url ? <img src={s.image_url} alt="" className="w-10 h-10 rounded-md object-cover" /> : <div className="w-10 h-10 rounded-md bg-muted" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.count} avaliações · ⭐ {s.avg}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Moderation history */}
          {canRespond && (
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 hover:bg-muted/50 transition-colors"
                aria-expanded={historyOpen}
              >
                <span className="inline-flex items-center gap-2"><History className="w-3.5 h-3.5" /> Histórico de moderação</span>
                {historyOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {historyOpen && (
                <ul className="divide-y divide-border max-h-72 overflow-y-auto">
                  {(history ?? []).length === 0 && (
                    <li className="p-4 text-center text-xs text-muted-foreground">Nenhum evento de moderação registrado.</li>
                  )}
                  {(history ?? []).map((h: any) => (
                    <li key={h.id} className="p-3 text-xs flex items-start gap-2">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${h.action === "hide_review" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {h.action === "hide_review" ? "Ocultou" : "Reexibiu"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">
                          <strong>{h.admin_name ?? "Admin"}</strong>
                          {h.metadata?.stars ? <> · {"★".repeat(h.metadata.stars)}</> : null}
                          {h.metadata?.comment ? <> · "{String(h.metadata.comment).slice(0, 80)}"</> : null}
                        </p>
                        <p className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                        {h.metadata?.reason && <p className="text-muted-foreground italic mt-0.5">Motivo: {h.metadata.reason}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="rounded-xl bg-card border border-border p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={wineFilter}
              onChange={(e) => setWineFilter(e.target.value)}
              className="text-sm rounded-lg border border-border bg-background px-2 py-2"
              aria-label="Filtrar por vinho"
            >
              <option value="">Todos os vinhos</option>
              {(summary ?? []).map((s: any) => (
                <option key={s.wine_id} value={s.wine_id}>{s.name} ({s.count})</option>
              ))}
            </select>
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar por usuário ou comentário…"
              className="text-sm rounded-lg border border-border bg-background px-3 py-2"
              aria-label="Buscar por usuário ou comentário"
            />
            <div className="flex gap-1 text-xs">
              {(["all", "visible", "hidden"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibilityFilter(v)}
                  className={`flex-1 py-2 rounded-lg border transition-colors ${visibilityFilter === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {v === "all" ? "Todas" : v === "visible" ? "Visíveis" : "Ocultas"}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Reviews</span>
              <span>{reviews.length} resultado(s)</span>
            </div>
            <ul className="divide-y divide-border">
              {reviews.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhuma avaliação encontrada.</li>}
              {reviews.map((r: any) => (
                <li key={r.id} className={`p-4 flex flex-col gap-2 ${r.is_hidden ? "bg-muted/30 opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-amber-500 text-sm">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                        <span className="text-xs text-muted-foreground">{r.wine_name} · {r.user_name ?? "Anônimo"}</span>
                        {r.is_hidden && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Oculta</span>
                        )}
                      </div>
                      {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
                      {r.public_response && (
                        <div className="mt-2 pl-3 border-l-2 border-primary/40 bg-primary/5 p-2 rounded">
                          <p className="text-[10px] uppercase font-semibold text-primary">Resposta da vinícola</p>
                          <p className="text-sm">{r.public_response}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {canRespond && !r.public_response && (
                        <button onClick={() => { setResponding(r); setResponseText(""); }} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">Responder</button>
                      )}
                      {canRespond && (
                        <button
                          onClick={() => toggleHidden(r)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border inline-flex items-center gap-1 justify-center hover:bg-muted"
                          aria-label={r.is_hidden ? "Reexibir avaliação" : "Ocultar avaliação"}
                        >
                          {r.is_hidden ? <><Eye className="w-3 h-3" /> Reexibir</> : <><EyeOff className="w-3 h-3" /> Ocultar</>}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "nps" && nps && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <NpsBar icon={Smile} label="Promotores (9-10)" count={nps.promoters} total={nps.total} color="emerald" />
            <NpsBar icon={Meh} label="Neutros (7-8)" count={nps.passives} total={nps.total} color="amber" />
            <NpsBar icon={Frown} label="Detratores (0-6)" count={nps.detractors} total={nps.total} color="rose" />
          </div>
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="p-3 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">Comentários abertos</div>
            <ul className="divide-y divide-border">
              {(nps.responses ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Sem comentários abertos ainda.</li>}
              {(nps.responses ?? []).map((r: any) => (
                <li key={r.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.score >= 9 ? "bg-emerald-100 text-emerald-700" : r.score >= 7 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>NPS {r.score}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {r.comment && <p className="text-sm">{r.comment}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Response modal */}
      {responding && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setResponding(null)}>
          <div className="bg-card rounded-2xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold mb-2">Responder review</h3>
            <p className="text-xs text-muted-foreground mb-3">"{responding.comment}" — {responding.user_name ?? "Anônimo"}</p>
            <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} className="w-full rounded-lg border border-border p-2 text-sm" placeholder="Sua resposta pública…" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setResponding(null)} className="text-sm px-3 py-2 rounded-lg border border-border">Cancelar</button>
              <button onClick={submitResponse} className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground">Publicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, suffix, tint }: any) {
  const c = tint === "emerald" ? "text-emerald-600" : tint === "rose" ? "text-rose-600" : "text-amber-600";
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <Icon className={`w-4 h-4 mb-1 ${c}`} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold">{value}{suffix ?? ""}</p>
    </div>
  );
}

function TabBtn({ active, onClick, label }: any) {
  return <button onClick={onClick} className={`px-3 py-2 text-sm border-b-2 transition-colors ${active ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground"}`}>{label}</button>;
}

function NpsBar({ icon: Icon, label, count, total, color }: any) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const c = color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4" /><span className="text-xs">{label}</span></div>
      <p className="font-display text-xl font-bold">{count}</p>
      <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden"><div className={c} style={{ width: `${pct}%`, height: "100%" }} /></div>
    </div>
  );
}
