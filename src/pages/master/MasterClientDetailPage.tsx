import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { invokeAuth } from "@/lib/auth-api";
import { ArrowLeft, FileText, Loader2, Plus, Pencil, Trash2, Download, FileSignature, Receipt, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { generateContractPDF, generateContractDOCX } from "@/lib/contractGenerator";

interface Contract {
  id: string;
  client_id: string;
  plan_name: string;
  setup_fee: number;
  monthly_fee: number;
  postsales_active: boolean;
  postsales_commission_pct: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
}

interface Invoice {
  id: string;
  contract_id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_link: string | null;
  notes: string | null;
}

const fmtBRL = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

const contractStatusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-100 text-emerald-700",
  ended: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
};
const invoiceStatusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
  cancelled: "bg-muted text-muted-foreground",
};

const emptyContract = {
  id: "", plan_name: "Plano Base", setup_fee: "1800", monthly_fee: "900",
  postsales_active: false, postsales_commission_pct: "5",
  start_date: "", end_date: "", status: "draft", notes: "",
};
const emptyInvoice = {
  id: "", contract_id: "", description: "Mensalidade", amount: "900",
  due_date: "", paid_at: "", status: "pending", payment_link: "", notes: "",
};

export default function MasterClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [contractModal, setContractModal] = useState(false);
  const [contractForm, setContractForm] = useState(emptyContract);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice);
  const [saving, setSaving] = useState(false);
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);

  const fetchData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await invokeAuth("master-clients", { action: "get_client", client_id: clientId });
      if (res.data?.error) throw new Error(res.data.error);
      setClient(res.data.client);
      setContracts(res.data.contracts ?? []);
      setInvoices(res.data.invoices ?? []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar");
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, [clientId]);

  // ── Contract handlers ──
  const openCreateContract = () => { setContractForm(emptyContract); setContractModal(true); };
  const openEditContract = (c: Contract) => {
    setContractForm({
      id: c.id, plan_name: c.plan_name,
      setup_fee: String(c.setup_fee), monthly_fee: String(c.monthly_fee),
      postsales_active: c.postsales_active, postsales_commission_pct: String(c.postsales_commission_pct),
      start_date: c.start_date || "", end_date: c.end_date || "",
      status: c.status, notes: c.notes || "",
    });
    setContractModal(true);
  };
  const saveContract = async () => {
    setSaving(true);
    try {
      const payload = {
        ...contractForm,
        client_id: clientId,
        setup_fee: Number(contractForm.setup_fee),
        monthly_fee: Number(contractForm.monthly_fee),
        postsales_commission_pct: Number(contractForm.postsales_commission_pct),
      };
      const res = await invokeAuth("master-clients", { action: "upsert_contract", contract: payload });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(contractForm.id ? "Contrato atualizado" : "Contrato criado");
      setContractModal(false);
      fetchData();
    } catch (e: any) { toast.error(e.message || "Erro"); }
    finally { setSaving(false); }
  };
  const removeContract = async () => {
    if (!deleteContract) return;
    try {
      await invokeAuth("master-clients", { action: "delete_contract", contract_id: deleteContract.id });
      toast.success("Contrato excluído");
      setDeleteContract(null); fetchData();
    } catch { toast.error("Erro"); }
  };

  // ── Invoice handlers ──
  const openCreateInvoice = (contractId: string, monthly: number) => {
    setInvoiceForm({ ...emptyInvoice, contract_id: contractId, amount: String(monthly) });
    setInvoiceModal(true);
  };
  const openEditInvoice = (i: Invoice) => {
    setInvoiceForm({
      id: i.id, contract_id: i.contract_id, description: i.description,
      amount: String(i.amount), due_date: i.due_date, paid_at: i.paid_at || "",
      status: i.status, payment_link: i.payment_link || "", notes: i.notes || "",
    });
    setInvoiceModal(true);
  };
  const saveInvoice = async () => {
    if (!invoiceForm.due_date || !invoiceForm.description) {
      toast.error("Descrição e vencimento obrigatórios"); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...invoiceForm,
        amount: Number(invoiceForm.amount),
        paid_at: invoiceForm.paid_at || null,
      };
      const res = await invokeAuth("master-clients", { action: "upsert_invoice", invoice: payload });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(invoiceForm.id ? "Cobrança atualizada" : "Cobrança criada");
      setInvoiceModal(false); fetchData();
    } catch (e: any) { toast.error(e.message || "Erro"); }
    finally { setSaving(false); }
  };
  const removeInvoice = async () => {
    if (!deleteInvoice) return;
    try {
      await invokeAuth("master-clients", { action: "delete_invoice", invoice_id: deleteInvoice.id });
      toast.success("Cobrança excluída");
      setDeleteInvoice(null); fetchData();
    } catch { toast.error("Erro"); }
  };

  // ── Contract generation ──
  const buildContractData = (c: Contract) => ({
    plan_name: c.plan_name,
    setup_fee: Number(c.setup_fee),
    monthly_fee: Number(c.monthly_fee),
    postsales_active: c.postsales_active,
    postsales_commission_pct: Number(c.postsales_commission_pct),
    start_date: c.start_date,
  });
  const downloadPDF = (c: Contract) => {
    if (!client) return;
    generateContractPDF(client, buildContractData(c));
    toast.success("Contrato PDF gerado");
  };
  const downloadDOCX = async (c: Contract) => {
    if (!client) return;
    await generateContractDOCX(client, buildContractData(c));
    toast.success("Contrato DOCX gerado");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!client) return <div className="p-6">Cliente não encontrado.</div>;

  const invoicesByContract = (cid: string) => invoices.filter(i => i.contract_id === cid);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/master/clients")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground truncate flex items-center gap-2">
            <Building2 className="w-6 h-6" /> {client.legal_name}
          </h1>
          <p className="text-xs text-muted-foreground">CNPJ {client.cnpj}{client.trade_name ? ` · ${client.trade_name}` : ""}</p>
        </div>
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts"><FileSignature className="w-4 h-4 mr-1" /> Contratos</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="w-4 h-4 mr-1" /> Cobranças</TabsTrigger>
          <TabsTrigger value="info"><FileText className="w-4 h-4 mr-1" /> Dados cadastrais</TabsTrigger>
        </TabsList>

        {/* ── CONTRACTS ── */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateContract}><Plus className="w-4 h-4 mr-1" /> Novo contrato</Button>
          </div>
          {contracts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
              Nenhum contrato cadastrado.
            </div>
          ) : contracts.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{c.plan_name}</h3>
                    <Badge className={contractStatusColor[c.status]}>{c.status}</Badge>
                    {c.postsales_active && <Badge variant="outline">Pós-venda EnoFlow ({c.postsales_commission_pct}%)</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Setup {fmtBRL(c.setup_fee)} · Mensal {fmtBRL(c.monthly_fee)} · Início {fmtDate(c.start_date)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => downloadPDF(c)}><Download className="w-4 h-4 mr-1" />PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadDOCX(c)}><Download className="w-4 h-4 mr-1" />DOCX</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEditContract(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteContract(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              {/* invoices for this contract */}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Cobranças deste contrato</p>
                  <Button size="sm" variant="ghost" onClick={() => openCreateInvoice(c.id, Number(c.monthly_fee))}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
                {invoicesByContract(c.id).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sem cobranças.</p>
                ) : invoicesByContract(c.id).map(i => (
                  <div key={i.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{i.description} <span className="text-muted-foreground text-xs">· vence {fmtDate(i.due_date)}</span></p>
                    </div>
                    <span className="font-semibold">{fmtBRL(Number(i.amount))}</span>
                    <Badge className={invoiceStatusColor[i.status]}>{i.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => openEditInvoice(i)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteInvoice(i)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── INVOICES (flat list) ── */}
        <TabsContent value="invoices" className="space-y-2">
          {invoices.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
              Nenhuma cobrança registrada.
            </div>
          ) : invoices.map(i => (
            <div key={i.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{i.description}</p>
                <p className="text-xs text-muted-foreground">Vence {fmtDate(i.due_date)}{i.paid_at ? ` · pago em ${fmtDate(i.paid_at)}` : ""}</p>
              </div>
              <span className="font-semibold">{fmtBRL(Number(i.amount))}</span>
              <Badge className={invoiceStatusColor[i.status]}>{i.status}</Badge>
              <Button size="sm" variant="ghost" onClick={() => openEditInvoice(i)}><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteInvoice(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="info" className="space-y-3">
          <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Info label="Razão social" value={client.legal_name} />
            <Info label="Nome fantasia" value={client.trade_name} />
            <Info label="CNPJ" value={client.cnpj} />
            <Info label="Vinícola vinculada" value={client.winery?.name} />
            <Info label="Endereço" value={client.address} />
            <Info label="Cidade / UF" value={[client.city, client.state].filter(Boolean).join(" / ")} />
            <Info label="CEP" value={client.zip_code} />
            <Info label="Responsável" value={client.responsible_name} />
            <Info label="CPF" value={client.responsible_cpf} />
            <Info label="Cargo" value={client.responsible_role} />
            <Info label="E-mail" value={client.responsible_email} />
            <Info label="Telefone" value={client.responsible_phone} />
            {client.notes && <div className="sm:col-span-2"><Info label="Observações" value={client.notes} /></div>}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── CONTRACT MODAL ── */}
      <Dialog open={contractModal} onOpenChange={setContractModal}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{contractForm.id ? "Editar contrato" : "Novo contrato"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nome do plano</Label><Input value={contractForm.plan_name} onChange={(e) => setContractForm({ ...contractForm, plan_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Taxa de setup (R$)</Label><Input type="number" value={contractForm.setup_fee} onChange={(e) => setContractForm({ ...contractForm, setup_fee: e.target.value })} /></div>
              <div><Label>Mensalidade (R$)</Label><Input type="number" value={contractForm.monthly_fee} onChange={(e) => setContractForm({ ...contractForm, monthly_fee: e.target.value })} /></div>
              <div><Label>Início</Label><Input type="date" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={contractForm.status} onValueChange={(v) => setContractForm({ ...contractForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="ended">Encerrado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>% Comissão pós-venda</Label><Input type="number" step="0.5" value={contractForm.postsales_commission_pct} onChange={(e) => setContractForm({ ...contractForm, postsales_commission_pct: e.target.value })} /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Módulo de pós-venda EnoFlow ativo</Label>
                <p className="text-xs text-muted-foreground">Habilita comissionamento sobre vendas geradas pelas campanhas</p>
              </div>
              <Switch checked={contractForm.postsales_active} onCheckedChange={(v) => setContractForm({ ...contractForm, postsales_active: v })} />
            </div>
            <div><Label>Observações</Label><Textarea rows={2} value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractModal(false)}>Cancelar</Button>
            <Button onClick={saveContract} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INVOICE MODAL ── */}
      <Dialog open={invoiceModal} onOpenChange={setInvoiceModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{invoiceForm.id ? "Editar cobrança" : "Nova cobrança"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Descrição</Label><Input value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor (R$)</Label><Input type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={invoiceForm.status} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Pago em</Label><Input type="date" value={invoiceForm.paid_at} onChange={(e) => setInvoiceForm({ ...invoiceForm, paid_at: e.target.value })} /></div>
            </div>
            <div><Label>Link de pagamento (opcional)</Label><Input value={invoiceForm.payment_link} onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_link: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Observações</Label><Textarea rows={2} value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceModal(false)}>Cancelar</Button>
            <Button onClick={saveInvoice} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirms */}
      <Dialog open={!!deleteContract} onOpenChange={(o) => !o && setDeleteContract(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Excluir contrato?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Removerá também todas as cobranças vinculadas.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContract(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={removeContract}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteInvoice} onOpenChange={(o) => !o && setDeleteInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Excluir cobrança?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteInvoice(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={removeInvoice}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </div>
  );
}
