import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { invokeAuth } from "@/lib/auth-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wine as WineIcon, Package, UtensilsCrossed, MapPin, Plus, Pencil, Trash2, Loader2, QrCode, Copy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import WineFormModal from "@/components/admin/WineFormModal";
import MenuItemFormModal from "@/components/admin/MenuItemFormModal";
import PackageFormModal from "@/components/admin/PackageFormModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import type { Wine, TastingPackage } from "@/hooks/useWinery";
import type { MenuItem } from "@/hooks/useMenuItems";

interface CapturePoint {
  id: string;
  name: string;
  category: string;
  redirect_url: string | null;
  linked_restaurant_cp_id: string | null;
  linked_shop_cp_id: string | null;
  linked_tasting_cp_id: string | null;
  linked_tasting_package_ids: string[];
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

export default function MasterWineryContentPage() {
  const { wineryId } = useParams<{ wineryId: string }>();
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [winery, setWinery] = useState<any>(null);
  const [loadingWinery, setLoadingWinery] = useState(true);

  // Locations state
  const [locations, setLocations] = useState<CapturePoint[]>([]);
  const [maxLocations, setMaxLocations] = useState(5);
  const [slug, setSlug] = useState("");
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [editLoc, setEditLoc] = useState<CapturePoint | null>(null);
  const [savingLoc, setSavingLoc] = useState(false);
  const [locForm, setLocForm] = useState({ name: "", category: "restaurant", redirect_url: "", linked_restaurant_cp_id: "", linked_shop_cp_id: "", linked_tasting_cp_id: "", linked_tasting_package_ids: [] as string[] });

  // Wines state
  const [formWine, setFormWine] = useState<Wine | null | undefined>(undefined);
  const [deleteWine, setDeleteWine] = useState<Wine | null>(null);
  const [deletingWine, setDeletingWine] = useState(false);

  // Menu state
  const [formMenuItem, setFormMenuItem] = useState<MenuItem | null | undefined>(undefined);
  const [deleteMenuItem, setDeleteMenuItem] = useState<MenuItem | null>(null);
  const [deletingMenu, setDeletingMenu] = useState(false);

  // Packages state
  const [formPkg, setFormPkg] = useState<TastingPackage | null | undefined>(undefined);
  const [deletePkg, setDeletePkg] = useState<TastingPackage | null>(null);
  const [deletingPkg, setDeletingPkg] = useState(false);

  // Fetch winery info
  useEffect(() => {
    if (!wineryId) return;
    supabase.from("wineries").select("*").eq("id", wineryId).single().then(({ data }) => {
      setWinery(data);
      setSlug(data?.slug ?? "");
      setLoadingWinery(false);
    });
  }, [wineryId]);

  // Fetch wines
  const { data: wines } = useQuery({
    queryKey: ["wines", wineryId],
    queryFn: async () => {
      const { data } = await supabase.from("wines").select("*").eq("winery_id", wineryId!);
      return data ?? [];
    },
    enabled: !!wineryId,
  });

  // Fetch menu items
  const { data: menuItems } = useQuery({
    queryKey: ["menu_items", wineryId],
    queryFn: async () => {
      const { data } = await supabase.from("menu_items").select("*").eq("winery_id", wineryId!);
      return data ?? [];
    },
    enabled: !!wineryId,
  });

  // Fetch tasting packages
  const { data: packages } = useQuery({
    queryKey: ["tasting_packages", wineryId],
    queryFn: async () => {
      const { data } = await supabase.from("tasting_packages").select("*").eq("winery_id", wineryId!);
      return data ?? [];
    },
    enabled: !!wineryId,
  });

  // Fetch locations
  const fetchLocations = async () => {
    const { data } = await invokeAuth("admin-locations", { action: "list", winery_id: wineryId });
    if (data?.locations) {
      setLocations(data.locations);
      setMaxLocations(data.max_locations ?? 5);
      setSlug(data.slug ?? "");
    }
  };

  useEffect(() => {
    if (wineryId) fetchLocations();
  }, [wineryId]);

  // Location handlers
  const openCreateLoc = () => {
    setEditLoc(null);
    setLocForm({ name: "", category: "restaurant", redirect_url: "", linked_restaurant_cp_id: "", linked_shop_cp_id: "", linked_tasting_cp_id: "", linked_tasting_package_ids: [] });
    setLocModalOpen(true);
  };

  const openEditLoc = (loc: CapturePoint) => {
    setEditLoc(loc);
    setLocForm({ name: loc.name, category: loc.category, redirect_url: loc.redirect_url || "", linked_restaurant_cp_id: loc.linked_restaurant_cp_id || "", linked_shop_cp_id: loc.linked_shop_cp_id || "", linked_tasting_cp_id: loc.linked_tasting_cp_id || "", linked_tasting_package_ids: loc.linked_tasting_package_ids ?? [] });
    setLocModalOpen(true);
  };

  const handleSaveLoc = async () => {
    if (!locForm.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSavingLoc(true);
    try {
      const payload = editLoc
        ? { action: "update", location_id: editLoc.id, winery_id: wineryId, ...locForm, redirect_url: locForm.redirect_url || null, linked_restaurant_cp_id: locForm.linked_restaurant_cp_id || null, linked_shop_cp_id: locForm.linked_shop_cp_id || null, linked_tasting_cp_id: locForm.linked_tasting_cp_id || null }
        : { action: "create", winery_id: wineryId, ...locForm, redirect_url: locForm.redirect_url || null, linked_restaurant_cp_id: locForm.linked_restaurant_cp_id || null, linked_shop_cp_id: locForm.linked_shop_cp_id || null, linked_tasting_cp_id: locForm.linked_tasting_cp_id || null };
      const { data, error } = await invokeAuth("admin-locations", payload);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(editLoc ? "Local atualizado!" : "Local criado!");
      setLocModalOpen(false);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSavingLoc(false);
    }
  };

  const handleDeleteLoc = async (loc: CapturePoint) => {
    if (!confirm(`Remover "${loc.name}"?`)) return;
    try {
      const { data, error } = await invokeAuth("admin-locations", { action: "delete", location_id: loc.id, winery_id: wineryId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Local removido!");
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  // Wine handlers
  const handleDeleteWine = async () => {
    if (!deleteWine) return;
    setDeletingWine(true);
    try {
      const { data, error } = await invokeAuth("admin-wines", { action: "delete", wine_id: deleteWine.id, winery_id: wineryId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Vinho excluído!");
      qc.invalidateQueries({ queryKey: ["wines", wineryId] });
    } catch { toast.error("Erro ao excluir"); }
    finally { setDeletingWine(false); setDeleteWine(null); }
  };

  // Menu handlers
  const handleDeleteMenu = async () => {
    if (!deleteMenuItem) return;
    setDeletingMenu(true);
    try {
      const { data, error } = await invokeAuth("admin-menu", { action: "delete", item_id: deleteMenuItem.id, winery_id: wineryId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Item excluído!");
      qc.invalidateQueries({ queryKey: ["menu_items", wineryId] });
    } catch { toast.error("Erro ao excluir"); }
    finally { setDeletingMenu(false); setDeleteMenuItem(null); }
  };

  // Package handlers
  const handleDeletePkg = async () => {
    if (!deletePkg) return;
    setDeletingPkg(true);
    try {
      const { data, error } = await invokeAuth("admin-packages", { action: "delete", package_id: deletePkg.id, winery_id: wineryId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Pacote excluído!");
      qc.invalidateQueries({ queryKey: ["tasting_packages", wineryId] });
    } catch { toast.error("Erro ao excluir"); }
    finally { setDeletingPkg(false); setDeletePkg(null); }
  };

  const buildQrUrl = (loc: CapturePoint) => {
    const base = `${window.location.origin}/app/${slug}`;
    const params = new URLSearchParams({ category: loc.category, location: loc.name, cp: loc.id });
    return `${base}?${params.toString()}`;
  };

  if (loadingWinery) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>;
  }

  if (!winery) {
    return <div className="text-center py-20 text-muted-foreground">Vinícola não encontrada</div>;
  }

  const restaurantLocations = locations.filter(l => l.category === "restaurant");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/master/wineries")} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex items-center gap-3">
          {winery.logo_url ? (
            <img src={winery.logo_url} alt={winery.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: winery.primary_color }}>
              {winery.name.charAt(0)}
            </div>
          )}
          <h1 className="font-display text-xl font-bold text-foreground">{winery.name}</h1>
        </div>
      </div>

      <Tabs defaultValue="locations">
        <TabsList className="mb-4">
          <TabsTrigger value="locations" className="gap-1.5"><MapPin className="w-3.5 h-3.5" /> Locais</TabsTrigger>
          <TabsTrigger value="wines" className="gap-1.5"><WineIcon className="w-3.5 h-3.5" /> Vinhos</TabsTrigger>
          <TabsTrigger value="menu" className="gap-1.5"><UtensilsCrossed className="w-3.5 h-3.5" /> Cardápio</TabsTrigger>
          <TabsTrigger value="packages" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Pacotes</TabsTrigger>
        </TabsList>

        {/* ─── LOCATIONS TAB ───────────────────────────── */}
        <TabsContent value="locations">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{locations.length}/{maxLocations} locais</p>
            <Button onClick={openCreateLoc} size="sm" className="gap-2" disabled={locations.length >= maxLocations}>
              <Plus className="w-4 h-4" /> Novo Local
            </Button>
          </div>
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
                        <Eye className="w-3 h-3" /> {loc.visit_count}
                      </span>
                    </div>
                    {(loc.linked_restaurant_cp_id || loc.linked_shop_cp_id || loc.linked_tasting_cp_id || (loc.linked_tasting_package_ids?.length > 0)) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {loc.linked_restaurant_cp_id && <span className="text-[9px] bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded-full">🍽️ {locations.find(l => l.id === loc.linked_restaurant_cp_id)?.name || "..."}</span>}
                        {loc.linked_shop_cp_id && <span className="text-[9px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full">🛒 {locations.find(l => l.id === loc.linked_shop_cp_id)?.name || "..."}</span>}
                        {loc.linked_tasting_cp_id && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">🍷 {locations.find(l => l.id === loc.linked_tasting_cp_id)?.name || "..."}</span>}
                        {loc.linked_tasting_package_ids?.map(pkgId => {
                          const pkg = packages?.find(p => p.id === pkgId);
                          return pkg ? <span key={pkgId} className="text-[9px] bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded-full">🎫 {pkg.name}</span> : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => { navigator.clipboard.writeText(buildQrUrl(loc)); toast.success("Link copiado!"); }} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Copiar Link">
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => openEditLoc(loc)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Editar">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDeleteLoc(loc)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors" title="Remover">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {locations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum ponto de captura</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── WINES TAB ───────────────────────────── */}
        <TabsContent value="wines">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{wines?.length ?? 0} vinhos</p>
            <Button onClick={() => setFormWine(null)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Novo Vinho
            </Button>
          </div>
          <div className="space-y-3">
            {wines?.map(wine => (
              <div key={wine.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {wine.image_url ? <img src={wine.image_url} alt={wine.name} className="w-full h-full object-cover" /> : <WineIcon className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{wine.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{wine.type} · R$ {Number(wine.price_bottle).toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {[{ label: "Deg", active: wine.on_tasting }, { label: "Rest", active: wine.on_restaurant }, { label: "Loja", active: wine.on_shop }].map(({ label, active }) => (
                        <span key={label} className="flex items-center gap-1">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${active ? "bg-green-500" : "bg-border"}`} />
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setFormWine(wine)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteWine(wine)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
              </div>
            ))}
            {(!wines || wines.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <WineIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum vinho cadastrado</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── MENU TAB ───────────────────────────── */}
        <TabsContent value="menu">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{menuItems?.length ?? 0} itens</p>
            <Button onClick={() => setFormMenuItem(null)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Novo Item
            </Button>
          </div>
          <div className="space-y-3">
            {menuItems?.map(item => (
              <div key={item.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <UtensilsCrossed className="w-5 h-5 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{item.category} · R$ {Number(item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setFormMenuItem(item)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteMenuItem(item)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
              </div>
            ))}
            {(!menuItems || menuItems.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum item no cardápio</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── PACKAGES TAB ───────────────────────────── */}
        <TabsContent value="packages">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{packages?.length ?? 0} pacotes</p>
            <Button onClick={() => setFormPkg(null)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Novo Pacote
            </Button>
          </div>
          <div className="space-y-3">
            {packages?.map(pkg => (
              <div key={pkg.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-semibold">{pkg.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{pkg.wine_ids.length} vinhos · {pkg.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-foreground">R$ {Number(pkg.price).toFixed(2)}</span>
                    <button onClick={() => setFormPkg(pkg)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeletePkg(pkg)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
              </div>
            ))}
            {(!packages || packages.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum pacote criado</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Location Create/Edit Modal */}
      <Dialog open={locModalOpen} onOpenChange={setLocModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editLoc ? "Editar Local" : "Novo Local"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome do Local</Label>
              <Input value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Restaurante Principal" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={locForm.category} onValueChange={v => setLocForm(f => ({ ...f, category: v }))}>
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
              <Input value={locForm.redirect_url} onChange={e => setLocForm(f => ({ ...f, redirect_url: e.target.value }))} placeholder="https://..." />
            </div>

            {/* Cross-linking */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-foreground mb-2">Vincular Conteúdo</p>
              {[
                { key: "linked_restaurant_cp_id" as const, label: "🍽️ Cardápio" },
                { key: "linked_shop_cp_id" as const, label: "🛒 Loja" },
                { key: "linked_tasting_cp_id" as const, label: "🍷 Degustação" },
              ].map(({ key, label }) => (
                <div key={key} className="mb-2">
                  <Label className="text-[11px]">{label}</Label>
                  <Select value={locForm[key] || "none"} onValueChange={v => setLocForm(f => ({ ...f, [key]: v === "none" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Padrão</SelectItem>
                      {locations.filter(l => l.id !== editLoc?.id).map(o => (
                        <SelectItem key={o.id} value={o.id}>{categoryLabels[o.category]?.split(" ")[0] || "📍"} {o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              {packages && packages.length > 0 && (
                <div className="mt-3">
                  <Label className="text-[11px]">🎫 Pacotes de Degustação</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-border rounded-lg p-2 mt-1">
                    {packages.map(pkg => (
                      <label key={pkg.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary cursor-pointer">
                        <Checkbox
                          checked={locForm.linked_tasting_package_ids.includes(pkg.id)}
                          onCheckedChange={(checked) => {
                            setLocForm(f => ({
                              ...f,
                              linked_tasting_package_ids: checked
                                ? [...f.linked_tasting_package_ids, pkg.id]
                                : f.linked_tasting_package_ids.filter(id => id !== pkg.id),
                            }));
                          }}
                        />
                        <span className="text-xs text-foreground">{pkg.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setLocModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveLoc} disabled={savingLoc || !locForm.name.trim()}>
                {savingLoc && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editLoc ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wine Form Modal */}
      {formWine !== undefined && (
        <WineFormModal wineryId={wineryId!} adminId={admin.id} wine={formWine} locations={locations} onClose={() => setFormWine(undefined)} />
      )}

      {/* Menu Item Form Modal */}
      {formMenuItem !== undefined && (
        <MenuItemFormModal wineryId={wineryId!} adminId={admin.id} item={formMenuItem} wines={wines ?? []} locations={restaurantLocations} onClose={() => setFormMenuItem(undefined)} />
      )}

      {/* Package Form Modal */}
      {formPkg !== undefined && (
        <PackageFormModal wineryId={wineryId!} adminId={admin.id} pkg={formPkg} wines={wines ?? []} onClose={() => setFormPkg(undefined)} />
      )}

      {/* Delete Modals */}
      {deleteWine && <DeleteConfirmModal title="Excluir vinho" message={`Excluir "${deleteWine.name}"?`} onConfirm={handleDeleteWine} onCancel={() => setDeleteWine(null)} loading={deletingWine} />}
      {deleteMenuItem && <DeleteConfirmModal title="Excluir item" message={`Excluir "${deleteMenuItem.name}"?`} onConfirm={handleDeleteMenu} onCancel={() => setDeleteMenuItem(null)} loading={deletingMenu} />}
      {deletePkg && <DeleteConfirmModal title="Excluir pacote" message={`Excluir "${deletePkg.name}"?`} onConfirm={handleDeletePkg} onCancel={() => setDeletePkg(null)} loading={deletingPkg} />}
    </div>
  );
}
