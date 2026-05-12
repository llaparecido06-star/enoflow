import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { Building2, Phone, Clock, Globe, Shield, Share2 } from "lucide-react";

const DAYS = [
  { id: "mon", label: "Segunda" }, { id: "tue", label: "Terça" }, { id: "wed", label: "Quarta" },
  { id: "thu", label: "Quinta" }, { id: "fri", label: "Sexta" }, { id: "sat", label: "Sábado" }, { id: "sun", label: "Domingo" },
];
const LANGS = [{ id: "pt-BR", label: "Português" }, { id: "en", label: "English" }, { id: "es", label: "Español" }];
const CURRENCIES = ["BRL", "USD", "EUR"];

export default function AdminWineryConfigPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const isOwner = admin?.role === "owner" || admin?.role === "master";
  const [cfg, setCfg] = useState<any>(null);

  useEffect(() => {
    invokeAuth("admin-winery-config", { action: "get_config", winery_id: winery.id }).then(({ data }) => {
      if (data?.winery) setCfg(data.winery);
    });
  }, [winery.id]);

  const save = async (section: string, values: any) => {
    const { error } = await invokeAuth("admin-winery-config", { action: "update_config", section, values, winery_id: winery.id });
    if (error) toast.error("Erro ao salvar"); else { toast.success("Salvo"); setCfg({ ...cfg, ...values }); }
  };

  if (!cfg) return <p className="text-center text-sm text-muted-foreground py-12">Carregando…</p>;
  if (!isOwner) return <p className="text-center text-sm text-muted-foreground py-12">Apenas o dono pode editar.</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2 mb-4">
        <Building2 className="w-6 h-6 text-primary" /> Configurações da Vinícola
      </h1>

      <SectionCard icon={Building2} title="Identidade" onSave={(v) => save("identity", v)} fields={[
        { key: "name", label: "Nome", value: cfg.name },
        { key: "primary_color", label: "Cor primária", value: cfg.primary_color, type: "color" },
        { key: "logo_url", label: "URL do logo", value: cfg.logo_url ?? "" },
      ]} />

      <SectionCard icon={Phone} title="Contato" onSave={(v) => save("contact", v)} fields={[
        { key: "contact_phone", label: "Telefone", value: cfg.contact_phone ?? "" },
        { key: "contact_email", label: "Email", value: cfg.contact_email ?? "" },
        { key: "address", label: "Endereço", value: cfg.address ?? "" },
        { key: "instagram_url", label: "Instagram", value: cfg.instagram_url ?? "" },
      ]} />

      <HoursCard hours={cfg.business_hours ?? {}} onSave={(business_hours) => save("hours", { business_hours })} />

      <I18nCard cfg={cfg} onSave={(v) => save("i18n", v)} />

      <SectionCard icon={Shield} title="LGPD" onSave={(v) => save("lgpd", v)} fields={[
        { key: "lgpd_policy_url", label: "URL da política", value: cfg.lgpd_policy_url ?? "" },
      ]} />
    </div>
  );
}

function SectionCard({ icon: Icon, title, fields, onSave }: any) {
  const [vals, setVals] = useState<any>(() => Object.fromEntries(fields.map((f: any) => [f.key, f.value])));
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-primary" /> {title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f: any) => (
          <div key={f.key}>
            <label className="text-[10px] text-muted-foreground uppercase block mb-1">{f.label}</label>
            <input type={f.type ?? "text"} value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
          </div>
        ))}
      </div>
      <button onClick={() => onSave(vals)} className="mt-3 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm">Salvar</button>
    </div>
  );
}

function HoursCard({ hours, onSave }: any) {
  const [h, setH] = useState<any>(hours);
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-primary" /> Horário de funcionamento</h3>
      <div className="space-y-2">
        {DAYS.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <span className="text-xs w-20 text-muted-foreground">{d.label}</span>
            <input value={h[d.id] ?? ""} onChange={(e) => setH({ ...h, [d.id]: e.target.value })} placeholder="09:00-18:00 ou Fechado" className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background" />
          </div>
        ))}
      </div>
      <button onClick={() => onSave(h)} className="mt-3 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm">Salvar</button>
    </div>
  );
}

function I18nCard({ cfg, onSave }: any) {
  const [defLang, setDefLang] = useState(cfg.default_language ?? "pt-BR");
  const [supported, setSupported] = useState<string[]>(cfg.supported_languages ?? ["pt-BR"]);
  const [currency, setCurrency] = useState(cfg.currency ?? "BRL");
  const toggle = (id: string) => setSupported((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Globe className="w-4 h-4 text-primary" /> Idiomas & Moeda</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Idioma padrão</label>
          <select value={defLang} onChange={(e) => setDefLang(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Moeda</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="text-[10px] text-muted-foreground uppercase block mb-1.5">Idiomas suportados</label>
        <div className="flex flex-wrap gap-1.5">
          {LANGS.map((l) => (
            <button key={l.id} type="button" onClick={() => toggle(l.id)} className={`text-xs px-2.5 py-1 rounded-full border ${supported.includes(l.id) ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => onSave({ default_language: defLang, supported_languages: supported, currency })} className="mt-3 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm">Salvar</button>
    </div>
  );
}
