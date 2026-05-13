import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invokeAuth } from "@/lib/auth-api";
import { Building2, Plus, Pencil, Trash2, Loader2, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Client {
  id: string;
  legal_name: string;
  trade_name: string | null;
  cnpj: string;
  responsible_name: string | null;
  responsible_phone: string | null;
  city: string | null;
  state: string | null;
  winery_id: string | null;
  winery?: { id: string; name: string; slug: string } | null;
  created_at: string;
}

const emptyForm = {
  id: "", legal_name: "", trade_name: "", cnpj: "",
  address: "", city: "", state: "", zip_code: "",
  responsible_name: "", responsible_cpf: "", responsible_role: "",
  responsible_email: "", responsible_phone: "",
  winery_id: "", notes: "",
};

export default function MasterClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [wineries, setWineries] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, winRes] = await Promise.all([
        invokeAuth("master-clients", { action: "list_clients" }),
        invokeAuth("master-clients", { action: "list_wineries" }),
      ]);
      if (clientsRes.data?.error) throw new Error(clientsRes.data.error);
      setClients(clientsRes.data?.clients ?? []);
      setWineries(winRes.data?.wineries ?? []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: Client) => {
    setForm({
      id: c.id,
      legal_name: c.legal_name, trade_name: c.trade_name || "", cnpj: c.cnpj,
      address: (c as any).address || "", city: c.city || "", state: c.state || "", zip_code: (c as any).zip_code || "",
      responsible_name: c.responsible_name || "", responsible_cpf: (c as any).responsible_cpf || "",
      responsible_role: (c as any).responsible_role || "",
      responsible_email: (c as any).responsible_email || "", responsible_phone: c.responsible_phone || "",
      winery_id: c.winery_id || "", notes: (c as any).notes || "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.legal_name || !form.cnpj) {
      toast.error("Razão social e CNPJ são obrigatórios"); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, winery_id: form.winery_id || null };
      const res = await invokeAuth("master-clients", { action: "upsert_client", client: payload });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(form.id ? "Cliente atualizado" : "Cliente cadastrado");
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const res = await invokeAuth("master-clients", { action: "delete_client", client_id: deleteTarget.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Cliente excluído");
      setDeleteTarget(null);
      fetchData();
    } catch (e: any) { toast.error(e.message || "Erro ao excluir"); }
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.legal_name.toLowerCase().includes(q) || c.cnpj.includes(q) || (c.trade_name?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6" /> Clientes B2B
          </h1>
          <p className="text-sm text-muted-foreground">Empresas contratantes, contratos e cobranças</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo cliente</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por razão social ou CNPJ" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          Nenhum cliente cadastrado.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/master/clients/${c.id}`)}>
                <p className="font-semibold text-foreground truncate">{c.legal_name}</p>
                <p className="text-xs text-muted-foreground">CNPJ {c.cnpj}{c.trade_name ? ` · ${c.trade_name}` : ""}</p>
                <p className="text-xs text-muted-foreground">
                  {c.responsible_name || "—"}{c.responsible_phone ? ` · ${c.responsible_phone}` : ""}
                  {c.winery ? ` · 🍷 ${c.winery.name}` : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/master/clients/${c.id}`)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar cliente" : "Novo cliente B2B"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Razão social *</Label><Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></div>
                <div><Label>Nome fantasia</Label><Input value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} /></div>
                <div><Label>CNPJ *</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" /></div>
                <div>
                  <Label>Vincular vinícola</Label>
                  <Select value={form.winery_id || "none"} onValueChange={(v) => setForm({ ...form, winery_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {wineries.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Endereço</Label>
              <Input placeholder="Rua, número, bairro" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Input placeholder="UF" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} />
                <Input placeholder="CEP" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Responsável legal</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Nome completo" value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} />
                <Input placeholder="CPF" value={form.responsible_cpf} onChange={(e) => setForm({ ...form, responsible_cpf: e.target.value })} />
                <Input placeholder="Cargo" value={form.responsible_role} onChange={(e) => setForm({ ...form, responsible_role: e.target.value })} />
                <Input placeholder="E-mail" type="email" value={form.responsible_email} onChange={(e) => setForm({ ...form, responsible_email: e.target.value })} />
                <Input placeholder="Telefone / WhatsApp" value={form.responsible_phone} onChange={(e) => setForm({ ...form, responsible_phone: e.target.value })} className="sm:col-span-2" />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Excluir cliente?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Isso removerá também todos os contratos e cobranças vinculados a <strong>{deleteTarget?.legal_name}</strong>.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={remove}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
