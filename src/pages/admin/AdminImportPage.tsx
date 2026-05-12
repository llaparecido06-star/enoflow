import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";

type Entity = "wines" | "leads" | "menu";

const TEMPLATES: Record<Entity, { headers: string[]; sample: string[]; label: string }> = {
  wines: {
    label: "Vinhos",
    headers: ["name", "type", "price_bottle", "year", "region", "grape", "alcohol_content", "description", "on_shop", "on_restaurant", "on_tasting"],
    sample: ["Cabernet Reserva", "tinto", "89.90", "2021", "Serra Gaúcha", "Cabernet Sauvignon", "13.5%", "Encorpado e elegante", "true", "false", "true"],
  },
  leads: {
    label: "Leads / Clientes",
    headers: ["name", "whatsapp", "gender", "birth_date", "category", "location"],
    sample: ["Maria Silva", "+5554991234567", "F", "1985-03-12", "tasting", "Bento Gonçalves"],
  },
  menu: {
    label: "Cardápio",
    headers: ["name", "category", "price", "description"],
    sample: ["Tábua de queijos", "Entradas", "45.00", "Seleção de queijos artesanais"],
  },
};

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQ = !inQ;
      else if (c === "," && !inQ) { values.push(cur); cur = ""; }
      else cur += c;
    }
    values.push(cur);
    const row: any = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim().replace(/^"|"$/g, ""); });
    return row;
  });
}

export default function AdminImportPage() {
  const { winery } = useOutletContext<{ winery: Winery }>();
  const [entity, setEntity] = useState<Entity>("wines");
  const [rows, setRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<{ count: number; errors: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    setRows(parsed);
    setPreview(null);
    if (!parsed.length) toast.error("CSV vazio ou inválido");
    else toast.success(`${parsed.length} linhas detectadas`);
  };

  const dryRun = async () => {
    if (!rows.length) return toast.error("Carregue um arquivo primeiro");
    setLoading(true);
    const { data, error } = await invokeAuth("admin-import", {
      action: `import_${entity}`, rows, dry_run: true, winery_id: winery.id,
    });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Erro");
    setPreview({ count: data?.count ?? 0, errors: data?.errors ?? [] });
  };

  const confirm = async () => {
    if (!preview) return;
    setLoading(true);
    const { data, error } = await invokeAuth("admin-import", {
      action: `import_${entity}`, rows, dry_run: false, winery_id: winery.id,
    });
    setLoading(false);
    if (error) return toast.error(error.message ?? "Erro ao importar");
    toast.success(`${data?.count ?? 0} registros importados`);
    setRows([]);
    setPreview(null);
  };

  const downloadTemplate = () => {
    const t = TEMPLATES[entity];
    const csv = [t.headers.join(","), t.sample.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `template_${entity}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Importação CSV</h1>
        <p className="text-sm text-muted-foreground mt-1">Importe vinhos, leads ou cardápio em massa.</p>
      </div>

      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Tipo de importação</label>
          <div className="flex gap-2 mt-2">
            {(Object.keys(TEMPLATES) as Entity[]).map((e) => (
              <button key={e} onClick={() => { setEntity(e); setRows([]); setPreview(null); }}
                className={`text-sm px-3 py-2 rounded-lg border ${entity === e ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                {TEMPLATES[e].label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={downloadTemplate} className="text-xs px-3 py-1.5 rounded-lg border border-border inline-flex items-center gap-1">
          <Download className="w-3 h-3" /> Baixar template
        </button>

        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="block mx-auto text-sm" />
          <p className="text-xs text-muted-foreground mt-2">Colunas obrigatórias: {TEMPLATES[entity].headers.slice(0, 3).join(", ")}…</p>
        </div>

        {rows.length > 0 && (
          <>
            <div className="rounded-lg bg-muted/30 p-3 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> {rows.length} linhas carregadas
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40"><tr>{TEMPLATES[entity].headers.slice(0, 5).map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-border">{TEMPLATES[entity].headers.slice(0, 5).map((h) => <td key={h} className="p-2">{r[h]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && <p className="text-xs text-muted-foreground p-2">+{rows.length - 5} linhas adicionais…</p>}
            </div>
            <div className="flex gap-2">
              <button disabled={loading} onClick={dryRun} className="text-sm px-4 py-2 rounded-lg border border-border">Validar (dry-run)</button>
              {preview && preview.errors.length === 0 && (
                <button disabled={loading} onClick={confirm} className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Confirmar importação
                </button>
              )}
            </div>
          </>
        )}

        {preview && (
          <div className={`rounded-lg p-3 text-sm ${preview.errors.length ? "bg-rose-50 border border-rose-200" : "bg-emerald-50 border border-emerald-200"}`}>
            <p className="font-medium flex items-center gap-1">
              {preview.errors.length ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {preview.count} válidas · {preview.errors.length} erros
            </p>
            {preview.errors.length > 0 && (
              <ul className="text-xs mt-2 space-y-0.5">
                {preview.errors.slice(0, 10).map((e, i) => <li key={i}>Linha {e.line}: {e.message}</li>)}
                {preview.errors.length > 10 && <li>+{preview.errors.length - 10} erros…</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
