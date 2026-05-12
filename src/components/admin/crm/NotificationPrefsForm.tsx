import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { Bell } from "lucide-react";

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
