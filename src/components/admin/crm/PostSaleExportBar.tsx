import { useState } from "react";
import { invokeAuth } from "@/lib/auth-api";
import { Download, FileDown } from "lucide-react";
import { toast } from "sonner";

interface Props {
  wineryId: string;
  wineryCurrency?: string;
  winerySlug?: string;
}

const STATUS_OPTIONS = [
  { id: "d1_enviado", label: "D+1 enviado" },
  { id: "d15_enviado", label: "D+15 enviado" },
  { id: "nps_respondido", label: "NPS respondido" },
  { id: "voucher_resgatado", label: "Voucher resgatado" },
  { id: "sem_retorno", label: "Sem retorno" },
];

export default function PostSaleExportBar({ wineryId, winerySlug }: Props) {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setStatuses((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const exportCsv = async () => {
    setLoading(true);
    const { data, error } = await invokeAuth("admin-crm", {
      action: "export_postsale",
      winery_id: wineryId,
      from: new Date(from).toISOString(),
      to: new Date(to + "T23:59:59").toISOString(),
      statuses,
    });
    setLoading(false);
    if (error || data?.error) { toast.error("Falha ao exportar"); return; }
    const rows = data?.rows ?? [];
    if (!rows.length) { toast.error("Nenhum lead atende aos filtros"); return; }
    const headers = ["Nome","WhatsApp","Data da visita","Voucher","Total","Voucher status","NPS","D+1","D+15"];
    const lines = rows.map((r: any) => [
      r.nome, r.whatsapp, r.data_visita, r.voucher_code, r.total,
      r.voucher_status, r.nps, r.status_d1, r.status_d15,
    ]);
    const csv = [headers, ...lines].map((l) => l.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `posvenda_${winerySlug || "vinicola"}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} linha(s) exportada(s)`);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-3 md:p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileDown className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">Exportar pós-venda</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">De</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Até</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground uppercase block mb-1.5">Filtrar por status (opcional)</label>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                statuses.includes(s.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
              }`}
            >{s.label}</button>
          ))}
        </div>
      </div>
      <button
        onClick={exportCsv}
        disabled={loading}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm disabled:opacity-50"
      >
        <Download className="w-4 h-4" /> {loading ? "Gerando…" : "Exportar CSV"}
      </button>
    </div>
  );
}
