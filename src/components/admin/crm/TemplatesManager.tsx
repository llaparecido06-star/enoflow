import { useEffect, useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquare, Pencil, X } from "lucide-react";

interface Template {
  id: string;
  name: string;
  stage: string | null;
  body: string;
}

const STAGE_OPTS = ["", "novo", "contatado", "qualificado", "convertido", "perdido"];
const VARS = ["{{nome}}", "{{vinho_favorito}}", "{{ultima_visita}}"];

export default function TemplatesManager({ wineryId }: { wineryId: string }) {
  const [list, setList] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const { data } = await invokeAuth("admin-crm", { action: "list_templates", winery_id: wineryId });
    setList(data?.templates ?? []);
  };
  useEffect(() => { load(); }, [wineryId]);

  const save = async (form: Template) => {
    const { error } = await invokeAuth("admin-crm", {
      action: "upsert_template",
      template_id: form.id || undefined,
      name: form.name, stage: form.stage, body: form.body,
      winery_id: wineryId,
    });
    if (error) toast.error("Erro ao salvar"); else { toast.success("Template salvo"); setShowForm(false); setEditing(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm("Excluir template?")) return;
    await invokeAuth("admin-crm", { action: "delete_template", template_id: id, winery_id: wineryId });
    toast.success("Excluído"); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{list.length} templates</p>
        <button onClick={() => { setEditing({ id: "", name: "", stage: null, body: "" }); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Novo template
        </button>
      </div>

      <div className="space-y-2">
        {list.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <p className="font-medium text-sm">{t.name}</p>
                {t.stage && <span className="text-[10px] bg-secondary px-2 py-0.5 rounded">{t.stage}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1.5 hover:bg-secondary rounded">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => del(t.id)} className="p-1.5 hover:bg-destructive/10 rounded text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum template ainda.</p>}
      </div>

      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-4 animate-scale-in">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">{editing.id ? "Editar" : "Novo"} template</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Nome" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              <select value={editing.stage ?? ""} onChange={(e) => setEditing({ ...editing, stage: e.target.value || null })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                {STAGE_OPTS.map((s) => <option key={s} value={s}>{s || "Qualquer estágio"}</option>)}
              </select>
              <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={5}
                placeholder="Mensagem… use {{nome}}, {{vinho_favorito}}, {{ultima_visita}}"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              <div className="flex flex-wrap gap-1">
                {VARS.map((v) => (
                  <button key={v} onClick={() => setEditing({ ...editing, body: editing.body + " " + v })}
                    className="text-[10px] bg-secondary px-2 py-1 rounded hover:bg-primary/10">{v}</button>
                ))}
              </div>
              <button onClick={() => save(editing)} className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
