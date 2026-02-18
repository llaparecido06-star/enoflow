import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Upload, FileSpreadsheet, FileText, Sparkles, Loader2, Check, Wine, UtensilsCrossed, Package } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WineryOption {
  id: string;
  name: string;
  slug: string;
}

const importTypes = [
  { id: "wines", label: "Vinhos", icon: Wine, description: "Nome, tipo, uva, safra, preço, região..." },
  { id: "menu", label: "Cardápio", icon: UtensilsCrossed, description: "Nome, categoria, preço, descrição..." },
  { id: "packages", label: "Pacotes", icon: Package, description: "Nome, descrição, preço..." },
];

export default function MasterImportPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const [wineries, setWineries] = useState<WineryOption[]>([]);
  const [wineryId, setWineryId] = useState("");
  const [importType, setImportType] = useState("wines");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<Record<string, unknown>[]>([]);
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const res = await invokeAuth("master-dashboard", { action: "list_admins" });
      setWineries(res.data?.wineries ?? []);
      if (res.data?.wineries?.length > 0) setWineryId(res.data.wineries[0].id);
      setLoading(false);
    };
    fetch();
  }, [admin.id]);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map(line => {
      const values = line.split(/[,;\t]/).map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    }).filter(obj => Object.values(obj).some(v => v));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === "csv" || ext === "tsv" || ext === "txt") {
      const text = await file.text();
      const items = parseCSV(text);
      setParsedItems(items);
      setRawText(text);
      toast.success(`${items.length} itens encontrados no arquivo`);
    } else if (ext === "xlsx" || ext === "xls") {
      // Read as text - basic parsing
      const text = await file.text();
      setRawText(text);
      toast.info("Para Excel, use a IA para interpretar o conteúdo ou converta para CSV");
    } else if (ext === "pdf") {
      setRawText(`[Arquivo PDF: ${file.name}]`);
      toast.info("Use a IA para interpretar o conteúdo do PDF");
    } else {
      toast.error("Formato não suportado. Use CSV, Excel ou PDF.");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const processWithAI = async () => {
    if (!rawText.trim()) { toast.error("Cole ou carregue o conteúdo primeiro"); return; }
    setAiProcessing(true);
    try {
      const typePrompts: Record<string, string> = {
        wines: 'Extraia uma lista de vinhos. Para cada vinho retorne um JSON com: name, type (Tinto/Branco/Rosé/Espumante), grape, year, region, price_bottle, price_glass, description, alcohol_content. Retorne APENAS um array JSON válido.',
        menu: 'Extraia uma lista de itens de cardápio. Para cada item retorne um JSON com: name, category, price, description. Retorne APENAS um array JSON válido.',
        packages: 'Extraia uma lista de pacotes de degustação. Para cada pacote retorne um JSON com: name, description, price. Retorne APENAS um array JSON válido.',
      };

      const prompt = `${typePrompts[importType]}\n\nConteúdo:\n${rawText.slice(0, 8000)}`;

      const res = await invokeAuth("sommelier-suggest", { prompt, mode: "extract" });

      if (res.error) throw res.error;

      const responseText = res.data?.suggestion || res.data?.text || JSON.stringify(res.data);
      // Try to extract JSON array from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]);
        setParsedItems(items);
        toast.success(`IA identificou ${items.length} itens!`);
      } else {
        toast.error("IA não conseguiu extrair dados estruturados. Tente reformatar o conteúdo.");
      }
    } catch (err: any) {
      toast.error("Erro ao processar com IA: " + (err.message || ""));
    } finally {
      setAiProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!wineryId) { toast.error("Selecione uma vinícola"); return; }
    if (parsedItems.length === 0) { toast.error("Nenhum item para importar"); return; }
    setProcessing(true);
    setResult(null);
    try {
      const res = await invokeAuth("master-dashboard", {
          action: "bulk_import",
          winery_id: wineryId,
          import_type: importType,
          items: parsedItems,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setResult({ success: true, count: res.data.inserted ?? 0 });
      toast.success(`${res.data.inserted} itens importados com sucesso!`);
      setParsedItems([]);
      setRawText("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Importação em Massa</h1>
        <p className="text-sm text-muted-foreground">Importe vinhos, cardápio ou pacotes via Excel, CSV, PDF ou IA</p>
      </div>

      {/* Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <Label>Vinícola</Label>
          <Select value={wineryId} onValueChange={setWineryId}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {wineries.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de Importação</Label>
          <div className="flex gap-2 mt-1.5">
            {importTypes.map(t => (
              <button
                key={t.id}
                onClick={() => setImportType(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  importType === t.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Carregar Arquivo
          </button>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf" onChange={handleFileUpload} className="hidden" />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV / Excel
            <FileText className="w-3.5 h-3.5 ml-2" /> PDF / Texto
          </div>
        </div>

        <div>
          <Label>Ou cole o conteúdo aqui (tabela, lista de vinhos, cardápio...)</Label>
          <Textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={`Cole aqui uma lista, tabela CSV, ou texto do cardápio/catálogo...\n\nExemplo para vinhos:\nnome,tipo,uva,safra,preço\nCabernet Reserve,Tinto,Cabernet Sauvignon,2020,189.90`}
            rows={6}
            className="mt-1.5 font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={processWithAI}
            disabled={aiProcessing || !rawText.trim()}
            variant="outline"
            className="gap-2"
          >
            {aiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Interpretar com IA
          </Button>

          {rawText.includes(",") && (
            <Button
              onClick={() => {
                const items = parseCSV(rawText);
                setParsedItems(items);
                toast.success(`${items.length} itens encontrados`);
              }}
              variant="outline"
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Parsear CSV
            </Button>
          )}
        </div>
      </div>

      {/* Preview */}
      {parsedItems.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-border bg-secondary/50 flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground">{parsedItems.length} itens prontos para importar</h3>
            <Button onClick={handleImport} disabled={processing} size="sm" className="gap-2">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Importar {parsedItems.length} itens
            </Button>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {Object.keys(parsedItems[0]).slice(0, 8).map(key => (
                    <th key={key} className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedItems.slice(0, 20).map((item, i) => (
                  <tr key={i} className="hover:bg-secondary/30">
                    {Object.values(item).slice(0, 8).map((val, j) => (
                      <td key={j} className="px-3 py-2 text-foreground truncate max-w-[150px]">{String(val ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedItems.length > 20 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">... e mais {parsedItems.length - 20} itens</p>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 text-center ${result.success ? "bg-green-500/10 border-green-500/20" : "bg-destructive/10 border-destructive/20"}`}>
          <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm font-medium text-foreground">{result.count} itens importados com sucesso!</p>
        </div>
      )}
    </div>
  );
}
