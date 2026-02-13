import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, Wine, Receipt, Loader2, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WineryMetric {
  id: string;
  name: string;
  slug: string;
  plan_level: string;
  primary_color: string;
  created_at: string;
  leads_count: number;
  wines_count: number;
  vouchers_count: number;
  vouchers_value: number;
  admins_count: number;
}

const planOptions = ["bronze", "silver", "gold"] as const;
const planColors: Record<string, string> = {
  bronze: "bg-orange-500/10 text-orange-400",
  silver: "bg-gray-400/10 text-gray-300",
  gold: "bg-accent/10 text-accent",
};

export default function MasterWineriesPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const [wineries, setWineries] = useState<WineryMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", primary_color: "#630D16", plan_level: "bronze" });

  const fetchData = async () => {
    try {
      const res = await supabase.functions.invoke("master-dashboard", {
        body: { admin_id: admin.id },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      setWineries(res.data.wineries ?? []);
    } catch {
      toast.error("Erro ao carregar vinícolas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [admin.id]);

  const updatePlan = async (wineryId: string, plan: string) => {
    setUpdatingId(wineryId);
    try {
      const res = await supabase.functions.invoke("master-dashboard", {
        body: { admin_id: admin.id, action: "update_plan", winery_id: wineryId, plan_level: plan },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Plano atualizado!");
      setWineries(prev => prev.map(w => w.id === wineryId ? { ...w, plan_level: plan } : w));
    } catch {
      toast.error("Erro ao atualizar plano");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateWinery = async () => {
    if (!form.name || !form.slug) { toast.error("Nome e slug obrigatórios"); return; }
    setSaving(true);
    try {
      const res = await supabase.functions.invoke("master-dashboard", {
        body: { admin_id: admin.id, action: "create_winery", ...form },
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Vinícola criada!");
      setCreateOpen(false);
      setForm({ name: "", slug: "", primary_color: "#630D16", plan_level: "bronze" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar vinícola");
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Vinícolas</h1>
          <p className="text-sm text-muted-foreground">{wineries.length} vinícolas na plataforma</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nova Vinícola
        </Button>
      </div>

      <div className="space-y-4">
        {wineries.map((w) => (
          <div key={w.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: w.primary_color }}
                >
                  {w.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">{w.name}</h3>
                  <p className="text-[11px] text-muted-foreground">/{w.slug} · desde {new Date(w.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={w.plan_level}
                  onChange={(e) => updatePlan(w.id, e.target.value)}
                  disabled={updatingId === w.id}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${planColors[w.plan_level] || "bg-secondary text-foreground"} focus:outline-none`}
                >
                  {planOptions.map(p => (
                    <option key={p} value={p} className="bg-card text-foreground">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <a
                  href={`/admin/${w.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-accent" />
                <div>
                  <p className="text-xs font-bold text-foreground">{w.leads_count}</p>
                  <p className="text-[9px] text-muted-foreground">Leads</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wine className="w-3.5 h-3.5 text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">{w.wines_count}</p>
                  <p className="text-[9px] text-muted-foreground">Vinhos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-green-500" />
                <div>
                  <p className="text-xs font-bold text-foreground">{w.vouchers_count}</p>
                  <p className="text-[9px] text-muted-foreground">Vouchers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-bold text-foreground">R$ {w.vouchers_value.toFixed(0)}</p>
                  <p className="text-[9px] text-muted-foreground">Receita</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Winery Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Vinícola</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }))} placeholder="Vinícola Example" />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="vinicola-example" />
              <p className="text-[10px] text-muted-foreground mt-1">/app/{form.slug || "slug"}</p>
            </div>
            <div>
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <Input value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>Plano</Label>
              <Select value={form.plan_level} onValueChange={v => setForm(f => ({ ...f, plan_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateWinery} disabled={saving || !form.name || !form.slug}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Vinícola"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
