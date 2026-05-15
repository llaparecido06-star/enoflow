import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { Building2, Phone, Clock, Globe, Shield, Share2, Sparkles, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

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
      <div className="mb-6">
        <h1 className="admin-page-title flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-card">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          Configurações da Vinícola
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 ml-12">Identidade, contato, idiomas e privacidade.</p>
      </div>

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

      <SectionCard icon={Share2} title="Redes & Reviews externas" onSave={(v) => save("external", v)} fields={[
        { key: "google_business_url", label: "Google Business", value: cfg.google_business_url ?? "" },
        { key: "tripadvisor_url", label: "TripAdvisor", value: cfg.tripadvisor_url ?? "" },
        { key: "facebook_url", label: "Facebook", value: cfg.facebook_url ?? "" },
        { key: "youtube_url", label: "YouTube", value: cfg.youtube_url ?? "" },
      ]} />

      <HoursCard hours={cfg.business_hours ?? {}} onSave={(business_hours) => save("hours", { business_hours })} />

      <I18nCard cfg={cfg} onSave={(v) => save("i18n", v)} />

      <SectionCard icon={Shield} title="LGPD" onSave={(v) => save("lgpd", v)} fields={[
        { key: "lgpd_policy_url", label: "URL da política", value: cfg.lgpd_policy_url ?? "" },
      ]} />

      <QuizCard cfg={cfg} onSave={(v) => save("quiz", v)} />
    </div>
  );
}

const DEFAULT_QUIZ_QUESTIONS = [
  {
    id: "type", emoji: "🍷", question: "Qual tipo de vinho você prefere?",
    options: [
      { label: "Tinto", emoji: "🍷", value: "Tinto" },
      { label: "Branco", emoji: "🥂", value: "Branco" },
      { label: "Rosé", emoji: "🌸", value: "Rosé" },
      { label: "Espumante", emoji: "🍾", value: "Espumante" },
    ],
  },
  {
    id: "sweetness", emoji: "🍬", question: "Qual nível de doçura?",
    options: [
      { label: "Seco", emoji: "🌵", value: "Seco" },
      { label: "Meio-seco", emoji: "🌤️", value: "Meio-seco" },
      { label: "Suave", emoji: "🌺", value: "Suave" },
      { label: "Doce", emoji: "🍯", value: "Doce" },
    ],
  },
  {
    id: "body", emoji: "💪", question: "Qual corpo você prefere?",
    options: [
      { label: "Leve", emoji: "🪶", value: "Leve" },
      { label: "Médio", emoji: "⚖️", value: "Médio" },
      { label: "Encorpado", emoji: "🏋️", value: "Encorpado" },
    ],
  },
];

function QuizCard({ cfg, onSave }: any) {
  const [enabled, setEnabled] = useState<boolean>(cfg.quiz_enabled !== false);
  const initial = (cfg.quiz_config?.questions && cfg.quiz_config.questions.length > 0)
    ? cfg.quiz_config.questions
    : DEFAULT_QUIZ_QUESTIONS;
  const [questions, setQuestions] = useState<any[]>(initial);

  const updateQ = (qi: number, patch: any) =>
    setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, ...patch } : q));
  const updateOpt = (qi: number, oi: number, patch: any) =>
    setQuestions(qs => qs.map((q, i) => i === qi ? {
      ...q,
      options: q.options.map((o: any, j: number) => j === oi ? { ...o, ...patch } : o),
    } : q));
  const addQuestion = () => setQuestions(qs => [...qs, { id: `q${Date.now()}`, emoji: "✨", question: "Nova pergunta", options: [{ label: "Opção 1", emoji: "🍷", value: "Opção 1" }] }]);
  const removeQuestion = (qi: number) => setQuestions(qs => qs.filter((_, i) => i !== qi));
  const addOption = (qi: number) => setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, options: [...q.options, { label: "Nova opção", emoji: "🍷", value: "Nova opção" }] } : q));
  const removeOption = (qi: number, oi: number) => setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, options: q.options.filter((_: any, j: number) => j !== oi) } : q));

  return (
    <div className="admin-card admin-card-hover p-5 mb-4">
      <h3 className="admin-section-title flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        Quiz do Sommelier
      </h3>

      <label className="flex items-center justify-between gap-3 mb-4 p-3 rounded-lg border border-border bg-background/50">
        <div>
          <p className="text-sm font-medium text-foreground">Ativar quiz para visitantes</p>
          <p className="text-xs text-muted-foreground">Quando desativado, o quiz não é exibido após o login.</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(e => !e)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
          aria-pressed={enabled}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`} />
        </button>
      </label>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="border border-border rounded-lg p-4 bg-background/40">
            <div className="flex items-start gap-2 mb-3">
              <input
                value={q.emoji ?? ""}
                onChange={(e) => updateQ(qi, { emoji: e.target.value })}
                className="w-14 text-center border border-border rounded-lg px-2 py-2 text-sm bg-background"
                placeholder="Emoji"
              />
              <input
                value={q.question ?? ""}
                onChange={(e) => updateQ(qi, { question: e.target.value })}
                className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background"
                placeholder="Texto da pergunta"
              />
              <button onClick={() => removeQuestion(qi)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" title="Remover pergunta">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {q.options.map((o: any, oi: number) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    value={o.emoji ?? ""}
                    onChange={(e) => updateOpt(qi, oi, { emoji: e.target.value })}
                    className="w-12 text-center border border-border rounded-lg px-2 py-1.5 text-xs bg-background"
                    placeholder="🍷"
                  />
                  <input
                    value={o.label ?? ""}
                    onChange={(e) => updateOpt(qi, oi, { label: e.target.value, value: e.target.value })}
                    className="flex-1 border border-border rounded-lg px-3 py-1.5 text-xs bg-background"
                    placeholder="Texto da opção"
                  />
                  <button onClick={() => removeOption(qi, oi)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" title="Remover opção" disabled={q.options.length <= 1}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => addOption(qi)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3 h-3" /> Adicionar opção
              </button>
            </div>
          </div>
        ))}

        <button onClick={addQuestion} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/50 w-full justify-center">
          <Plus className="w-4 h-4" /> Adicionar pergunta
        </button>
      </div>

      <button
        onClick={() => onSave({ quiz_enabled: enabled, quiz_config: { questions } })}
        className="mt-4 inline-flex items-center gap-2 gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-card hover:shadow-elevated hover:scale-[1.02] transition-all"
      >
        Salvar quiz
      </button>
    </div>
  );
}

function SectionCard({ icon: Icon, title, fields, onSave }: any) {
  const [vals, setVals] = useState<any>(() => Object.fromEntries(fields.map((f: any) => [f.key, f.value])));
  return (
    <div className="admin-card admin-card-hover p-5 mb-4">
      <h3 className="admin-section-title flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f: any) => (
          <div key={f.key}>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">{f.label}</label>
            <input type={f.type ?? "text"} value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all" />
          </div>
        ))}
      </div>
      <button onClick={() => onSave(vals)} className="mt-4 inline-flex items-center gap-2 gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-card hover:shadow-elevated hover:scale-[1.02] transition-all">Salvar</button>
    </div>
  );
}

function HoursCard({ hours, onSave }: any) {
  const [h, setH] = useState<any>(hours);
  return (
    <div className="admin-card admin-card-hover p-5 mb-4">
      <h3 className="admin-section-title flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-primary" />
        </div>
        Horário de funcionamento
      </h3>
      <div className="space-y-2">
        {DAYS.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <span className="text-xs w-20 text-muted-foreground font-medium">{d.label}</span>
            <input value={h[d.id] ?? ""} onChange={(e) => setH({ ...h, [d.id]: e.target.value })} placeholder="09:00-18:00 ou Fechado" className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all" />
          </div>
        ))}
      </div>
      <button onClick={() => onSave(h)} className="mt-4 inline-flex items-center gap-2 gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-card hover:shadow-elevated hover:scale-[1.02] transition-all">Salvar</button>
    </div>
  );
}

function I18nCard({ cfg, onSave }: any) {
  const [defLang, setDefLang] = useState(cfg.default_language ?? "pt-BR");
  const [supported, setSupported] = useState<string[]>(cfg.supported_languages ?? ["pt-BR"]);
  const [currency, setCurrency] = useState(cfg.currency ?? "BRL");
  const toggle = (id: string) => setSupported((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  return (
    <div className="admin-card admin-card-hover p-5 mb-4">
      <h3 className="admin-section-title flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Globe className="w-4 h-4 text-primary" />
        </div>
        Idiomas & Moeda
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">Idioma padrão</label>
          <select value={defLang} onChange={(e) => setDefLang(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all">
            {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">Moeda</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">Idiomas suportados</label>
        <div className="flex flex-wrap gap-1.5">
          {LANGS.map((l) => (
            <button key={l.id} type="button" onClick={() => toggle(l.id)} className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${supported.includes(l.id) ? "bg-foreground text-background border-foreground shadow-card" : "border-border text-muted-foreground hover:bg-muted/60"}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => onSave({ default_language: defLang, supported_languages: supported, currency })} className="mt-4 inline-flex items-center gap-2 gradient-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shadow-card hover:shadow-elevated hover:scale-[1.02] transition-all">Salvar</button>
    </div>
  );
}
