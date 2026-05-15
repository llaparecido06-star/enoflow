import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Sparkles, Calendar } from "lucide-react";

export default function AdminQuizResponsesPage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [responses, setResponses] = useState<any[]>([]);
  const [aggregates, setAggregates] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    const payload: any = { winery_id: winery.id };
    if (from) payload.from = new Date(from).toISOString();
    if (to) payload.to = new Date(to + "T23:59:59").toISOString();
    const { data } = await invokeAuth("admin-quiz-responses", payload);
    setResponses(data?.responses ?? []);
    setAggregates(data?.aggregates ?? {});
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [winery.id]);

  const totalAnswers = responses.length;

  const aggList = useMemo(() => {
    return Object.entries(aggregates).map(([key, counts]) => {
      const [, question] = key.split("::");
      const items = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const total = items.reduce((s, [, n]) => s + n, 0);
      return { question, items, total };
    });
  }, [aggregates]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="admin-page-title flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-card">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          Respostas do Quiz
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 ml-12">Análise das preferências capturadas pelo Sommelier.</p>
      </div>

      <div className="admin-card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background" />
        </div>
        <button onClick={load} className="gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-card">Filtrar</button>
        <span className="text-xs text-muted-foreground ml-auto">{totalAnswers} respostas</span>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-12">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {aggList.map(({ question, items, total }) => (
              <div key={question} className="admin-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">{question}</h3>
                <div className="space-y-2">
                  {items.map(([value, count]) => {
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={value}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground">{value}</span>
                          <span className="text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full gradient-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {aggList.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">Nenhuma resposta no período.</p>
            )}
          </div>

          <h2 className="admin-section-title mb-3">Histórico</h2>
          <div className="space-y-2">
            {responses.map((r) => (
              <div key={r.id} className="admin-card p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{r.lead?.name ?? "—"}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(r.answers ?? []).map((a: any, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-foreground">
                      <span className="text-muted-foreground">{a.question}:</span> {a.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
