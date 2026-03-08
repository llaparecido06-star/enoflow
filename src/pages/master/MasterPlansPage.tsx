import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { invokeAuth } from "@/lib/auth-api";
import { CreditCard, Plus, Pencil, Trash2, Loader2, Check, X, MapPin, Wine, Users, Percent } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

interface Plan {
  id: string;
  name: string;
  plan_key: string;
  price: number;
  max_locations: number;
  max_wines: number | null;
  max_staff: number | null;
  commission_rate: number;
  enabled_modules: string[];
  features: string[];
  is_active: boolean;
  created_at: string;
}

const tierColors: Record<string, string> = {
  bronze: "from-orange-400 to-orange-600",
  silver: "from-gray-400 to-gray-600",
  gold: "from-amber-400 to-amber-600",
};

const defaultForm = {
  name: "", plan_key: "", price: "0", max_locations: "5",
  max_wines: "", max_staff: "", commission_rate: "0",
  enabled_modules: ["tasting", "restaurant", "shop"] as string[],
  features: "" as string, is_active: true,
};

export default function MasterPlansPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await invokeAuth("master-dashboard", { action: "list_plans" });
      if (res.data?.error) throw new Error(res.data.error);
      setPlans(res.data?.plans ?? []);
    } catch {
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditTarget(p);
    setForm({
      name: p.name, plan_key: p.plan_key, price: String(p.price),
      max_locations: String(p.max_locations),
      max_wines: p.max_wines != null ? String(p.max_wines) : "",
      max_staff: p.max_staff != null ? String(p.max_staff) : "",
      commission_rate: String(p.commission_rate),
      enabled_modules: p.enabled_modules,
      features: p.features.join("\n"),
      is_active: p.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.plan_key) { toast.error("Nome e chave são obrigatórios"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        plan_key: form.plan_key,
        price: parseFloat(form.price) || 0,
        max_locations: parseInt(form.max_locations) || 5,
        max_wines: form.max_wines ? parseInt(form.max_wines) : null,
        max_staff: form.max_staff ? parseInt(form.max_staff) : null,
        commission_rate: parseFloat(form.commission_rate) || 0,
        enabled_modules: form.enabled_modules,
        features: form.features.split("\n").map(f => f.trim()).filter(Boolean),
        is_active: form.is_active,
      };

      if (editTarget) {
        const res = await invokeAuth("master-dashboard", { action: "update_plan_config", plan_id: editTarget.id, ...payload });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Plano atualizado!");
      } else {
        const res = await invokeAuth("master-dashboard", { action: "create_plan", ...payload });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Plano criado!");
      }
      setModalOpen(false);
      fetchPlans();
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
      const res = await invokeAuth("master-dashboard", { action: "delete_plan", plan_id: deleteTarget.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Plano removido!");
      setDeleteTarget(null);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
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
          <h1 className="font-display text-2xl font-bold text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground">{plans.length} planos configurados</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-card rounded-xl border border-border overflow-hidden ${!plan.is_active ? "opacity-60" : ""}`}>
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${tierColors[plan.plan_key] || "from-primary to-primary/80"} px-5 py-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">{plan.name}</h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(plan)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-white/80" />
                  </button>
                  <button onClick={() => setDeleteTarget(plan)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-white/80" />
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-white">R$ {plan.price.toFixed(0)}</span>
                <span className="text-white/70 text-sm">/mês</span>
              </div>
              {!plan.is_active && (
                <span className="inline-block mt-1 text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">Inativo</span>
              )}
            </div>

            {/* Plan details */}
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{plan.max_locations}</p>
                    <p className="text-[9px] text-muted-foreground">Locais</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wine className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{plan.max_wines ?? "∞"}</p>
                    <p className="text-[9px] text-muted-foreground">Vinhos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{plan.max_staff ?? "∞"}</p>
                    <p className="text-[9px] text-muted-foreground">Staff</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{plan.commission_rate}%</p>
                    <p className="text-[9px] text-muted-foreground">Comissão</p>
                  </div>
                </div>
              </div>

              {plan.features.length > 0 && (
                <div className="border-t border-border pt-3 space-y-1.5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[9px] text-muted-foreground pt-1">
                Chave: <code className="bg-muted px-1 py-0.5 rounded text-[9px]">{plan.plan_key}</code>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, ...(editTarget ? {} : { plan_key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") }) }))} placeholder="Premium" />
              </div>
              <div>
                <Label>Chave</Label>
                <Input value={form.plan_key} onChange={e => setForm(f => ({ ...f, plan_key: e.target.value }))} placeholder="premium" disabled={!!editTarget} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço mensal (R$)</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Máx. Locais</Label>
                <Input type="number" min="1" value={form.max_locations} onChange={e => setForm(f => ({ ...f, max_locations: e.target.value }))} />
              </div>
              <div>
                <Label>Máx. Vinhos</Label>
                <Input type="number" min="0" value={form.max_wines} onChange={e => setForm(f => ({ ...f, max_wines: e.target.value }))} placeholder="∞" />
                <p className="text-[9px] text-muted-foreground mt-0.5">Vazio = ilimitado</p>
              </div>
              <div>
                <Label>Máx. Staff</Label>
                <Input type="number" min="0" value={form.max_staff} onChange={e => setForm(f => ({ ...f, max_staff: e.target.value }))} placeholder="∞" />
                <p className="text-[9px] text-muted-foreground mt-0.5">Vazio = ilimitado</p>
              </div>
            </div>
            <div>
              <Label>Módulos</Label>
              <div className="flex gap-4 mt-1">
                {(["tasting", "restaurant", "shop"] as const).map(mod => (
                  <label key={mod} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={form.enabled_modules.includes(mod)}
                      onCheckedChange={(checked) => {
                        setForm(f => ({
                          ...f,
                          enabled_modules: checked
                            ? [...f.enabled_modules, mod]
                            : f.enabled_modules.filter(m => m !== mod),
                        }));
                      }}
                    />
                    {mod === "tasting" ? "Degustação" : mod === "restaurant" ? "Restaurante" : "Loja"}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Recursos (um por linha)</Label>
              <textarea
                value={form.features}
                onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                placeholder={"Degustação básica\nAté 3 pontos de captura\nSommelier Digital"}
                className="w-full min-h-[100px] p-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setModalOpen(false)} variant="outline" className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editTarget ? "Salvar" : "Criar Plano"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Plano</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover o plano <strong>{deleteTarget?.name}</strong>?
          </p>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => setDeleteTarget(null)} variant="outline" className="flex-1">Cancelar</Button>
            <Button onClick={handleDelete} variant="destructive" disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
