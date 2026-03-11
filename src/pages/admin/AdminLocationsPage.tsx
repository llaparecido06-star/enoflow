import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, Loader2, QrCode, Copy, ExternalLink, Link as LinkIcon, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useTastingPackages, type TastingPackage } from "@/hooks/useWinery";
import { Checkbox } from "@/components/ui/checkbox";

interface CapturePoint {
  id: string;
  name: string;
  category: string;
  redirect_url: string | null;
  linked_restaurant_cp_id: string | null;
  linked_shop_cp_id: string | null;
  linked_tasting_cp_id: string | null;
  linked_tasting_package_ids: string[];
  created_at: string;
  visit_count: number;
}

const categoryLabels: Record<string, string> = {
  restaurant: "🍽️ Restaurante",
  tasting: "🍷 Degustação",
  shop: "🛒 Loja",
  wifi: "📶 WiFi",
  other: "📍 Outro",
};

const categoryColors: Record<string, string> = {
  restaurant: "bg-orange-500/10 text-orange-600",
  tasting: "bg-primary/10 text-primary",
  shop: "bg-green-500/10 text-green-600",
  wifi: "bg-blue-500/10 text-blue-600",
  other: "bg-muted text-muted-foreground",
};

export default function AdminLocationsPage() {
  const { winery } = useOutletContext<{ winery: any }>();
  const [locations, setLocations] = useState<CapturePoint[]>([]);
  const [maxLocations, setMaxLocations] = useState(5);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CapturePoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [qrTarget, setQrTarget] = useState<CapturePoint | null>(null);
  const [form, setForm] = useState({ name: "", category: "restaurant", redirect_url: "", linked_restaurant_cp_id: "", linked_shop_cp_id: "", linked_tasting_cp_id: "", linked_tasting_package_ids: [] as string[] });
  const { data: tastingPackages } = useTastingPackages(winery?.id);

  const fetchData = async () => {
    try {
      const { data, error } = await invokeAuth("admin-locations", { action: "list" });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLocations(data.locations ?? []);
      setMaxLocations(data.max_locations ?? 5);
      setSlug(data.slug ?? "");
    } catch {
      toast.error("Erro ao carregar locais");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [winery?.id]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: "", category: "restaurant", redirect_url: "", linked_restaurant_cp_id: "", linked_shop_cp_id: "", linked_tasting_cp_id: "", linked_tasting_package_ids: [] });
    setModalOpen(true);
  };

  const openEdit = (loc: CapturePoint) => {
    setEditTarget(loc);
    setForm({ name: loc.name, category: loc.category, redirect_url: loc.redirect_url || "", linked_restaurant_cp_id: loc.linked_restaurant_cp_id || "", linked_shop_cp_id: loc.linked_shop_cp_id || "", linked_tasting_cp_id: loc.linked_tasting_cp_id || "", linked_tasting_package_ids: loc.linked_tasting_package_ids ?? [] });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      if (editTarget) {
        const payload = { action: "update", location_id: editTarget.id, ...form, redirect_url: form.redirect_url || null, linked_restaurant_cp_id: form.linked_restaurant_cp_id || null, linked_shop_cp_id: form.linked_shop_cp_id || null, linked_tasting_cp_id: form.linked_tasting_cp_id || null, linked_tasting_package_ids: form.linked_tasting_package_ids };
        const { data, error } = await invokeAuth("admin-locations", payload);
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Local atualizado!");
      } else {
        const payload = { action: "create", ...form, redirect_url: form.redirect_url || null, linked_restaurant_cp_id: form.linked_restaurant_cp_id || null, linked_shop_cp_id: form.linked_shop_cp_id || null, linked_tasting_cp_id: form.linked_tasting_cp_id || null, linked_tasting_package_ids: form.linked_tasting_package_ids };
        const { data, error } = await invokeAuth("admin-locations", payload);
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Local criado!");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loc: CapturePoint) => {
    if (!confirm(`Remover "${loc.name}"?`)) return;
    try {
      const { data, error } = await invokeAuth("admin-locations", { action: "delete", location_id: loc.id });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Local removido!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const buildQrUrl = (loc: CapturePoint) => {
    const base = `${window.location.origin}/app/${slug}`;
    const params = new URLSearchParams({ category: loc.category, location: loc.name, cp: loc.id });
    return `${base}?${params.toString()}`;
  };

  const qrImageUrl = (loc: CapturePoint) => {
    const url = buildQrUrl(loc);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  };

  const atLimit = locations.length >= maxLocations;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6" /> Pontos de Captura
          </h1>
          <p className="text-sm text-muted-foreground">
            {locations.length}/{maxLocations} locais cadastrados
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2" disabled={atLimit}>
          <Plus className="w-4 h-4" /> Novo Local
        </Button>
      </div>

      {atLimit && (
        <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl px-4 py-3 text-sm mb-4">
          ⚠️ Limite de {maxLocations} locais atingido. Contate o administrador para aumentar o limite.
        </div>
      )}

      {locations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum ponto de captura cadastrado</p>
          <p className="text-xs mt-1">Crie locais para gerar QR Codes personalizados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map(loc => (
            <div key={loc.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between">
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                     <h3 className="font-semibold text-foreground truncate">{loc.name}</h3>
                     <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColors[loc.category] || categoryColors.other}`}>
                       {categoryLabels[loc.category] || loc.category}
                     </span>
                     <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                       <Eye className="w-3 h-3" />
                       {loc.visit_count} {loc.visit_count === 1 ? "visita" : "visitas"}
                     </span>
                   </div>
                   {loc.redirect_url && (
                     <a href={loc.redirect_url} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 hover:underline truncate">
                       <LinkIcon className="w-3 h-3 shrink-0" /> {loc.redirect_url}
                     </a>
                   )}
                   {(loc.linked_restaurant_cp_id || loc.linked_shop_cp_id || loc.linked_tasting_cp_id) && (
                     <div className="flex flex-wrap gap-1 mt-1">
                       {loc.linked_restaurant_cp_id && (
                         <span className="text-[9px] bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded-full">
                           🍽️ {locations.find(l => l.id === loc.linked_restaurant_cp_id)?.name || "..."}
                         </span>
                       )}
                       {loc.linked_shop_cp_id && (
                         <span className="text-[9px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full">
                           🛒 {locations.find(l => l.id === loc.linked_shop_cp_id)?.name || "..."}
                         </span>
                       )}
                       {loc.linked_tasting_cp_id && (
                         <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                           🍷 {locations.find(l => l.id === loc.linked_tasting_cp_id)?.name || "..."}
                         </span>
                       )}
                     </div>
                   )}
                 </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => setQrTarget(loc)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="QR Code">
                    <QrCode className="w-4 h-4 text-primary" />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(buildQrUrl(loc));
                      toast.success("Link copiado!");
                    }}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Copiar Link"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => openEdit(loc)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Editar">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(loc)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Remover">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Local" : "Novo Local"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome do Local</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Restaurante do Lago" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">🍽️ Restaurante</SelectItem>
                  <SelectItem value="tasting">🍷 Degustação</SelectItem>
                  <SelectItem value="shop">🛒 Loja</SelectItem>
                  <SelectItem value="wifi">📶 WiFi</SelectItem>
                  <SelectItem value="other">📍 Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL de Redirecionamento (opcional)</Label>
              <Input value={form.redirect_url} onChange={e => setForm(f => ({ ...f, redirect_url: e.target.value }))} placeholder="https://cardapio.exemplo.com" />
              <p className="text-[10px] text-muted-foreground mt-1">Ex: link do cardápio digital, catálogo, etc.</p>
            </div>

            {/* Linked Capture Points */}
            <div className="border-t border-border pt-4 mt-2">
              <p className="text-xs font-semibold text-foreground mb-1">Vincular Conteúdo de Outros Locais</p>
              <p className="text-[10px] text-muted-foreground mb-3">Defina qual cardápio, loja ou degustação será exibido ao escanear o QR deste ponto.</p>
              
              {[
                { key: "linked_restaurant_cp_id" as const, label: "🍽️ Cardápio (Restaurante)", filterCat: "restaurant" },
                { key: "linked_shop_cp_id" as const, label: "🛒 Loja", filterCat: "shop" },
                { key: "linked_tasting_cp_id" as const, label: "🍷 Degustação", filterCat: "tasting" },
              ].map(({ key, label, filterCat }) => {
                const options = locations.filter(l => l.id !== editTarget?.id);
                return (
                  <div key={key} className="mb-2">
                    <Label className="text-[11px]">{label}</Label>
                    <Select value={form[key] || "none"} onValueChange={v => setForm(f => ({ ...f, [key]: v === "none" ? "" : v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Usar padrão (próprio local)</SelectItem>
                        {options.map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {categoryLabels[o.category]?.split(" ")[0] || "📍"} {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}

              {/* Tasting Packages */}
              {tastingPackages && tastingPackages.length > 0 && (
                <div className="mt-3">
                  <Label className="text-[11px]">🎫 Pacotes de Degustação Disponíveis</Label>
                  <p className="text-[10px] text-muted-foreground mb-2">Selecione quais pacotes estarão disponíveis ao escanear este QR. Vazio = todos.</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-border rounded-lg p-2">
                    {tastingPackages.map(pkg => (
                      <label key={pkg.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary cursor-pointer">
                        <Checkbox
                          checked={form.linked_tasting_package_ids.includes(pkg.id)}
                          onCheckedChange={(checked) => {
                            setForm(f => ({
                              ...f,
                              linked_tasting_package_ids: checked
                                ? [...f.linked_tasting_package_ids, pkg.id]
                                : f.linked_tasting_package_ids.filter(id => id !== pkg.id),
                            }));
                          }}
                        />
                        <span className="text-xs text-foreground">{pkg.name}</span>
                        {pkg.description && <span className="text-[10px] text-muted-foreground truncate">— {pkg.description}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editTarget ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={!!qrTarget} onOpenChange={() => setQrTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" /> QR Code
            </DialogTitle>
          </DialogHeader>
          {qrTarget && (
            <div className="text-center space-y-4 pt-2">
              <p className="text-sm font-medium text-foreground">{qrTarget.name}</p>
              <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[qrTarget.category] || categoryColors.other}`}>
                {categoryLabels[qrTarget.category] || qrTarget.category}
              </span>
              <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                <img src={qrImageUrl(qrTarget)} alt="QR Code" className="w-64 h-64" />
              </div>
              <p className="text-[10px] text-muted-foreground break-all px-4">{buildQrUrl(qrTarget)}</p>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(buildQrUrl(qrTarget));
                    toast.success("Link copiado!");
                  }}
                  className="gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar Link
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = qrImageUrl(qrTarget);
                    a.download = `qr-${slug}-${qrTarget.name.toLowerCase().replace(/\s+/g, "-")}.png`;
                    a.click();
                  }}
                  className="gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" /> Baixar QR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
