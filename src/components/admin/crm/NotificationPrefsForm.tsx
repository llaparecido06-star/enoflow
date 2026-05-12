import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { Bell, AlertTriangle, Clock, UserPlus, Play, Moon, Sun } from "lucide-react";

interface Props { wineryId: string }

interface Prefs {
  digest_frequency: string;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  notify_overdue: boolean;
  notify_scheduled_ready: boolean;
  notify_new_lead: boolean;
}

const DEFAULT: Prefs = {
  digest_frequency: "15min",
  quiet_hours_start: 22,
  quiet_hours_end: 7,
  notify_overdue: true,
  notify_scheduled_ready: true,
  notify_new_lead: true,
};

const FREQ = [
  { id: "off", label: "Desligado (só badge)" },
  { id: "5min", label: "A cada 5 min" },
  { id: "15min", label: "A cada 15 min" },
  { id: "1h", label: "A cada 1 hora" },
  { id: "daily", label: "Digest diário" },
];

export default function NotificationPrefsForm({ wineryId }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    invokeAuth("admin-crm", { action: "get_prefs", winery_id: wineryId }).then(({ data }) => {
      if (!mounted) return;
      if (data?.prefs) setPrefs({ ...DEFAULT, ...data.prefs });
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [wineryId]);

  const save = async () => {
    setSaving(true);
    const { error } = await invokeAuth("admin-crm", { action: "update_prefs", ...prefs, winery_id: wineryId });
    setSaving(false);
    if (error) toast.error("Erro ao salvar"); else toast.success("Preferências salvas");
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-6">Carregando…</p>;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Notificações pessoais</h3>
      </div>

      <Field label="Frequência de alerta (toast)">
        <select
          value={prefs.digest_frequency}
          onChange={(e) => setPrefs({ ...prefs, digest_frequency: e.target.value })}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
        >
          {FREQ.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <p className="text-[10px] text-muted-foreground mt-1">O sino sempre acumula o badge; isto controla apenas os toasts.</p>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Início do silêncio (h)">
          <input type="number" min={0} max={23} value={prefs.quiet_hours_start ?? ""} onChange={(e) => setPrefs({ ...prefs, quiet_hours_start: e.target.value ? Number(e.target.value) : null })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </Field>
        <Field label="Fim do silêncio (h)">
          <input type="number" min={0} max={23} value={prefs.quiet_hours_end ?? ""} onChange={(e) => setPrefs({ ...prefs, quiet_hours_end: e.target.value ? Number(e.target.value) : null })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </Field>
      </div>

      <div className="space-y-2">
        <Toggle label="Tarefas atrasadas" value={prefs.notify_overdue} onChange={(v) => setPrefs({ ...prefs, notify_overdue: v })} />
        <Toggle label="Mensagens prontas para enviar" value={prefs.notify_scheduled_ready} onChange={(v) => setPrefs({ ...prefs, notify_scheduled_ready: v })} />
        <Toggle label="Novos leads sem dono" value={prefs.notify_new_lead} onChange={(v) => setPrefs({ ...prefs, notify_new_lead: v })} />
      </div>

      <button onClick={save} disabled={saving} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm disabled:opacity-50">
        {saving ? "Salvando…" : "Salvar preferências"}
      </button>

      <PreviewPanel prefs={prefs} wineryId={wineryId} />
    </div>
  );
}

function Field({ label, children }: any) {
  return <div><label className="text-[10px] text-muted-foreground uppercase block mb-1">{label}</label>{children}</div>;
}

function Toggle({ label, value, onChange }: any) {
  return (
    <label className="flex items-center justify-between p-2 border border-border rounded-lg cursor-pointer hover:bg-secondary/30">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-colors relative ${value ? "bg-primary" : "bg-secondary"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : ""}`} />
      </button>
    </label>
  );
}

const FREQ_MS: Record<string, number> = {
  off: Infinity,
  "5min": 5 * 60_000,
  "15min": 15 * 60_000,
  "1h": 60 * 60_000,
  daily: 24 * 60 * 60_000,
};
const FREQ_LABEL: Record<string, string> = {
  off: "Desligado (só badge)", "5min": "5 min", "15min": "15 min", "1h": "1 hora", daily: "Diário",
};

function isQuiet(prefs: Prefs, hourOverride?: number): boolean {
  const s = prefs.quiet_hours_start, e = prefs.quiet_hours_end;
  if (s == null || e == null) return false;
  const h = hourOverride ?? new Date().getHours();
  return s <= e ? (h >= s && h < e) : (h >= s || h < e);
}

function PreviewPanel({ prefs, wineryId }: { prefs: Prefs; wineryId: string }) {
  const [counts, setCounts] = useState<{ overdue: number; ready: number; unassigned: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [simHour, setSimHour] = useState<string>("");

  const refresh = async () => {
    setLoading(true);
    const { data } = await invokeAuth("admin-crm", { action: "notifications", winery_id: wineryId });
    setLoading(false);
    if (data?.success) {
      setCounts({
        overdue: data.overdue_tasks?.length ?? 0,
        ready: data.ready_messages?.length ?? 0,
        unassigned: data.unassigned_leads?.length ?? 0,
      });
    }
  };

  useEffect(() => { refresh(); }, [wineryId]);

  const hourForSim = simHour === "" ? new Date().getHours() : Number(simHour);
  const quietNow = isQuiet(prefs, hourForSim);
  const freqMs = FREQ_MS[prefs.digest_frequency] ?? FREQ_MS["15min"];
  const total = counts ? counts.overdue + counts.ready + counts.unassigned : 0;

  const fireToast = (kind: "overdue" | "ready" | "lead") => {
    if (quietNow) {
      toast("Silêncio ativo — toast suprimido", {
        description: `Quiet hours: ${prefs.quiet_hours_start}h–${prefs.quiet_hours_end}h. Apenas o badge seria atualizado.`,
        icon: <Moon className="w-4 h-4" />,
      });
      return;
    }
    if (freqMs === Infinity) {
      toast("Frequência desligada — só badge", { description: "Mude para 5/15/60min para receber toasts." });
      return;
    }
    if (kind === "overdue") {
      if (!prefs.notify_overdue) { toast("Tarefas atrasadas desativadas no seu perfil"); return; }
      toast.error("⚠️ 3 tarefa(s) atrasada(s)", { description: "Exemplo: Follow-up João Silva · vencida há 2h" });
    } else if (kind === "ready") {
      if (!prefs.notify_scheduled_ready) { toast("Mensagens prontas desativadas no seu perfil"); return; }
      toast("📨 2 mensagem(ns) prontas para enviar", { description: "Exemplo: D+1 — Maria Souza" });
    } else {
      if (!prefs.notify_new_lead) { toast("Novos leads desativados no seu perfil"); return; }
      toast("👤 1 novo lead sem dono", { description: "Exemplo: Pedro Alves · QR Restaurante" });
    }
  };

  return (
    <div className="border-t border-border pt-4 mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <Play className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold">Prévia & Teste</h4>
      </div>

      {/* Status atual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatusChip
          icon={quietNow ? Moon : Sun}
          label={quietNow ? "Silêncio ativo" : "Toasts ativos"}
          value={`${hourForSim}h`}
          tone={quietNow ? "muted" : "ok"}
        />
        <StatusChip icon={Clock} label="Frequência" value={FREQ_LABEL[prefs.digest_frequency] ?? prefs.digest_frequency} tone="info" />
        <StatusChip icon={Bell} label="Badge agora" value={loading ? "…" : String(total)} tone={total > 0 ? "warn" : "ok"} />
        <StatusChip
          icon={AlertTriangle}
          label="Atrasadas"
          value={loading ? "…" : String(counts?.overdue ?? 0)}
          tone={(counts?.overdue ?? 0) > 0 ? "danger" : "ok"}
        />
      </div>

      {/* Simulação de hora */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[10px] text-muted-foreground uppercase">Simular hora</label>
        <input
          type="number" min={0} max={23} placeholder={`agora (${new Date().getHours()}h)`}
          value={simHour} onChange={(e) => setSimHour(e.target.value)}
          className="w-28 border border-border rounded-lg px-2 py-1 text-xs bg-background"
        />
        {simHour !== "" && (
          <button onClick={() => setSimHour("")} className="text-[10px] text-muted-foreground underline">limpar</button>
        )}
        <button onClick={refresh} className="text-[10px] text-primary underline ml-auto">Atualizar contadores</button>
      </div>

      {/* Botões de teste */}
      <div className="flex flex-wrap gap-2">
        <TestBtn icon={AlertTriangle} label="Simular tarefa atrasada" onClick={() => fireToast("overdue")} tone="danger" />
        <TestBtn icon={Clock} label="Simular msg pronta" onClick={() => fireToast("ready")} tone="warn" />
        <TestBtn icon={UserPlus} label="Simular novo lead" onClick={() => fireToast("lead")} tone="info" />
      </div>

      <p className="text-[10px] text-muted-foreground">
        Os testes respeitam suas preferências salvas (quiet hours, frequência e toggles). Em silêncio o toast é suprimido e apenas o badge do sino seria incrementado. Cada funcionário tem suas próprias preferências e badge.
      </p>
    </div>
  );
}

function StatusChip({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "ok" | "warn" | "danger" | "info" | "muted" }) {
  const colors: Record<string, string> = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    muted: "border-border bg-secondary/40 text-muted-foreground",
  };
  return (
    <div className={`rounded-lg border px-2.5 py-1.5 ${colors[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase opacity-80">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="text-sm font-semibold truncate">{value}</div>
    </div>
  );
}

function TestBtn({ icon: Icon, label, onClick, tone }: { icon: any; label: string; onClick: () => void; tone: "danger" | "warn" | "info" }) {
  const colors: Record<string, string> = {
    danger: "border-rose-300 text-rose-700 hover:bg-rose-50",
    warn: "border-amber-300 text-amber-700 hover:bg-amber-50",
    info: "border-blue-300 text-blue-700 hover:bg-blue-50",
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs ${colors[tone]}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}
