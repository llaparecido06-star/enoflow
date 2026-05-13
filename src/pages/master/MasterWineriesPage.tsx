import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { invokeAuth } from "@/lib/auth-api";
import { Building2, Users, Wine, Receipt, Loader2, ExternalLink, Plus, Pencil, Trash2, Image, ToggleLeft, Copy, Link as LinkIcon, Power, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface WineryMetric {
  id: string;
  name: string;
  slug: string;
  plan_level: string;
  primary_color: string;
  logo_url: string | null;
  created_at: string;
  leads_count: number;
  wines_count: number;
  vouchers_count: number;
  vouchers_value: number;
  admins_count: number;
}

const planOptions = ["bronze", "silver", "gold"] as const;
const planColors: Record<string, string> = {
  bronze: "bg-orange-500/10 text-orange-500",
  silver: "bg-muted text-muted-foreground",
  gold: "bg-accent/10 text-accent",
};

export default function MasterWineriesPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const navigate = useNavigate();
  const [wineries, setWineries] = useState<WineryMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WineryMetric | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WineryMetric | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", primary_color: "#630D16", plan_level: "bronze", logo_url: "", subscription_value: "0", platform_commission_rate: "0", enabled_modules: ["tasting", "restaurant", "shop"] as string[], status: "active", max_locations: "5", currency: "BRL" });

  const fetchData = async () => {
    try {
      const res = await invokeAuth("master-dashboard", {});
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

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: "", slug: "", primary_color: "#630D16", plan_level: "bronze", logo_url: "", subscription_value: "0", platform_commission_rate: "0", enabled_modules: ["tasting", "restaurant", "shop"], status: "active", max_locations: "5", currency: "BRL" });
    setModalOpen(true);
  };

  const openEdit = (w: WineryMetric) => {
    setEditTarget(w);
    setForm({ name: w.name, slug: w.slug, primary_color: w.primary_color, plan_level: w.plan_level, logo_url: w.logo_url || "", subscription_value: String((w as any).subscription_value ?? "0"), platform_commission_rate: String((w as any).platform_commission_rate ?? "0"), enabled_modules: (w as any).enabled_modules ?? ["tasting", "restaurant", "shop"], status: (w as any).status ?? "active", max_locations: String((w as any).max_locations ?? "5"), currency: (w as any).currency ?? "BRL" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Nome e slug obrigatórios"); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const res = await invokeAuth("master-dashboard", {
            action: "update_winery",
            winery_id: editTarget.id,
            name: form.name,
            slug: form.slug,
            primary_color: form.primary_color,
            plan_level: form.plan_level,
            logo_url: form.logo_url || null,
            subscription_value: parseFloat(form.subscription_value) || 0,
            platform_commission_rate: parseFloat(form.platform_commission_rate) || 0,
            enabled_modules: form.enabled_modules,
            status: form.status,
            max_locations: parseInt(form.max_locations) || 5,
            currency: form.currency,
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Vinícola atualizada!");
      } else {
        const res = await invokeAuth("master-dashboard", { action: "create_winery", ...form, logo_url: form.logo_url || null, subscription_value: parseFloat(form.subscription_value) || 0, platform_commission_rate: parseFloat(form.platform_commission_rate) || 0, enabled_modules: form.enabled_modules, max_locations: parseInt(form.max_locations) || 5, currency: form.currency });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Vinícola criada!");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await invokeAuth("master-dashboard", { action: "delete_winery", winery_id: deleteTarget.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Vinícola removida!");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data, error } = await invokeAuth("upload-logo", formData);
      if (error || !data?.url) {
        toast.error(data?.error || "Erro ao enviar logo");
        return;
      }
      setForm(f => ({ ...f, logo_url: data.url }));
      toast.success("Logo enviado!");
    } catch {
      toast.error("Erro ao enviar logo");
    }
  };

  const updatePlan = async (wineryId: string, plan: string) => {
    setUpdatingId(wineryId);
    try {
      const res = await invokeAuth("master-dashboard", { action: "update_plan", winery_id: wineryId, plan_level: plan });
      if (res.error) throw res.error;
      toast.success("Plano atualizado!");
      setWineries(prev => prev.map(w => w.id === wineryId ? { ...w, plan_level: plan } : w));
    } catch {
      toast.error("Erro ao atualizar plano");
    } finally {
      setUpdatingId(null);
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
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nova Vinícola
        </Button>
      </div>

      <div className="space-y-4">
        {wineries.map((w) => (
          <div key={w.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {w.logo_url ? (
                  <img src={w.logo_url} alt={w.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: w.primary_color }}
                  >
                    {w.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">{w.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    /{w.slug} · desde {new Date(w.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(w as any).status !== "active" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Inativa</span>
                )}
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
                <button onClick={() => openEdit(w)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Editar">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setDeleteTarget(w)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-4">
              <a
                href={`/app/${w.slug}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Acessar App
              </a>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/app/${w.slug}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link copiado!");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Copy className="w-3 h-3" /> Copiar Link
              </button>
              <button
                onClick={() => navigate(`/master/wineries/${w.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                <Settings2 className="w-3 h-3" /> Gerenciar Conteúdo
              </button>
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

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Vinícola" : "Nova Vinícola"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 pb-2">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({
                  ...f,
                  name: e.target.value,
                  ...(editTarget ? {} : { slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }),
                }))}
                placeholder="Vinícola Example"
              />
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
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                    <Image className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs" />
                  <p className="text-[10px] text-muted-foreground mt-1">Ou cole a URL abaixo</p>
                  <Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." className="mt-1" />
                </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mensalidade (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.subscription_value} onChange={e => setForm(f => ({ ...f, subscription_value: e.target.value }))} placeholder="2500.00" />
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input type="number" step="0.01" min="0" max="100" value={form.platform_commission_rate} onChange={e => setForm(f => ({ ...f, platform_commission_rate: e.target.value }))} placeholder="5" />
                <p className="text-[10px] text-muted-foreground mt-1">{parseFloat(form.platform_commission_rate) || 0}% sobre vendas</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Máx. Locais</Label>
                <Input type="number" min="1" max="100" value={form.max_locations} onChange={e => setForm(f => ({ ...f, max_locations: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground mt-1">Pontos de captura</p>
              </div>
              <div>
                <Label>Moeda</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">R$ (BRL)</SelectItem>
                    <SelectItem value="USD">$ (USD)</SelectItem>
                    <SelectItem value="EUR">€ (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Módulos do Turista</Label>
              <p className="text-[10px] text-muted-foreground mb-2">Selecione quais seções ficam visíveis para o visitante</p>
              <div className="space-y-2">
                {([
                  { key: "tasting", label: "Degustação" },
                  { key: "restaurant", label: "Restaurante" },
                  { key: "shop", label: "Loja" },
                ] as const).map(mod => (
                  <label key={mod.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.enabled_modules.includes(mod.key)}
                      onCheckedChange={(checked) => {
                        setForm(f => ({
                          ...f,
                          enabled_modules: checked
                            ? [...f.enabled_modules, mod.key]
                            : f.enabled_modules.filter(m => m !== mod.key),
                        }));
                      }}
                    />
                    <span className="text-sm">{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {editTarget && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa (Kill Switch)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Vinícolas inativas bloqueiam login da equipe e acesso do turista</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editTarget ? "Salvar" : "Criar Vinícola"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Vinícola</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong>? Todos os dados (vinhos, leads, vouchers, admins) serão permanentemente excluídos.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover Tudo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
