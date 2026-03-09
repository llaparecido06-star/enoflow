import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { invokeAuth } from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Send, Trash2, Edit, ExternalLink, Loader2, MessageSquare, Users, Filter, X } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  sent_count: number;
  created_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
}

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  gender?: string;
  income_class?: string;
  preferences_summary?: string;
  created_at?: string;
}

interface Filters {
  gender?: string;
  income_class?: string;
  has_persona?: boolean;
  registered_after?: string;
  registered_before?: string;
}

const typeLabels: Record<string, string> = {
  promotion: "Promoção",
  new_wine: "Novo Vinho",
  event: "Evento",
  follow_up: "Follow-up",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
};

const genderLabels: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  nao_informar: "Não informado",
};

const incomeLabels: Record<string, string> = {
  ate_3k: "Até R$3k",
  "3k_8k": "R$3k–8k",
  "8k_15k": "R$8k–15k",
  acima_15k: "Acima R$15k",
};

export default function AdminCampaignsPage() {
  const { winery } = useOutletContext<{ winery: { id: string; name: string } }>();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [sendingCampaign, setSendingCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("promotion");
  const [saving, setSaving] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<Filters>({});

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const res = await invokeAuth("admin-campaigns", { action: "list" });
    if (res.data?.campaigns) setCampaigns(res.data.campaigns);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const fetchLeads = useCallback(async (f: Filters) => {
    setLeadsLoading(true);
    const cleanFilters: Record<string, unknown> = {};
    if (f.gender) cleanFilters.gender = f.gender;
    if (f.income_class) cleanFilters.income_class = f.income_class;
    if (f.has_persona) cleanFilters.has_persona = true;
    if (f.registered_after) cleanFilters.registered_after = f.registered_after;
    if (f.registered_before) cleanFilters.registered_before = f.registered_before;

    const res = await invokeAuth("admin-campaigns", {
      action: "get_leads",
      filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
    });
    if (res.data?.leads) setLeads(res.data.leads);
    setLeadsLoading(false);
  }, []);

  const activeFilterCount = [
    filters.gender,
    filters.income_class,
    filters.has_persona,
    filters.registered_after,
    filters.registered_before,
  ].filter(Boolean).length;

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setMessage("");
    setType("promotion");
    setFormOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setTitle(c.title);
    setMessage(c.message);
    setType(c.type);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) return;
    setSaving(true);
    const action = editing ? "update" : "create";
    const payload: Record<string, unknown> = { action, title, message, type };
    if (editing) payload.id = editing.id;

    const res = await invokeAuth("admin-campaigns", payload);
    if (res.data?.success) {
      toast({ title: editing ? "Campanha atualizada" : "Campanha criada" });
      setFormOpen(false);
      fetchCampaigns();
    } else {
      toast({ title: "Erro", description: res.data?.error || "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta campanha?")) return;
    await invokeAuth("admin-campaigns", { action: "delete", id });
    toast({ title: "Campanha excluída" });
    fetchCampaigns();
  };

  const openSend = async (c: Campaign) => {
    setSendingCampaign(c);
    setSendOpen(true);
    setFilters({});
    setShowFilters(false);
    await fetchLeads({});
  };

  const applyFilters = () => {
    fetchLeads(filters);
  };

  const clearFilters = () => {
    setFilters({});
    fetchLeads({});
  };

  const sendToAll = () => {
    if (leads.length === 0 || !sendingCampaign) return;
    const msg = sendingCampaign.message;
    // Open each wa.me link with a small delay to avoid popup blockers
    leads.forEach((lead, i) => {
      setTimeout(() => {
        window.open(generateWhatsAppLink(lead.whatsapp, msg), "_blank");
      }, i * 600);
    });
    toast({ title: `Abrindo ${leads.length} janelas do WhatsApp...` });
  };

  const generateWhatsAppLink = (phone: string, msg: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const encodedMsg = encodeURIComponent(msg);
    return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  };

  const markAsSent = async () => {
    if (!sendingCampaign) return;
    await invokeAuth("admin-campaigns", {
      action: "mark_sent",
      id: sendingCampaign.id,
      sent_count: leads.length,
    });
    toast({ title: "Campanha marcada como enviada!" });
    setSendOpen(false);
    fetchCampaigns();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Crie e envie notificações para seus turistas</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nova Campanha
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhuma campanha criada ainda</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Criar primeira campanha
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="border rounded-xl p-4 bg-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{c.title}</h3>
                    <Badge variant="secondary" className={statusColors[c.status] || ""}>
                      {c.status === "draft" ? "Rascunho" : c.status === "sent" ? "Enviada" : "Agendada"}
                    </Badge>
                    <Badge variant="outline">{typeLabels[c.type] || c.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Criada: {new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                    {c.sent_at && <span>Enviada: {new Date(c.sent_at).toLocaleDateString("pt-BR")}</span>}
                    {c.sent_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {c.sent_count} leads
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openSend(c)} title="Enviar">
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} title="Excluir">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Título</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Promoção de Inverno" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotion">Promoção</SelectItem>
                  <SelectItem value="new_wine">Novo Vinho</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Mensagem</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Olá! Temos uma promoção especial..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/1000 caracteres</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !title.trim() || !message.trim()}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Modal with Filters */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Enviar: {sendingCampaign?.title}</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 mb-2">
            <p className="text-sm text-muted-foreground">{sendingCampaign?.message}</p>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Segmentar
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
                <X className="w-3 h-3 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Sexo</label>
                  <Select
                    value={filters.gender || "all"}
                    onValueChange={(v) => setFilters((f) => ({ ...f, gender: v === "all" ? undefined : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(genderLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Faixa de renda</label>
                  <Select
                    value={filters.income_class || "all"}
                    onValueChange={(v) => setFilters((f) => ({ ...f, income_class: v === "all" ? undefined : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {Object.entries(incomeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Cadastro após</label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filters.registered_after || ""}
                    onChange={(e) => setFilters((f) => ({ ...f, registered_after: e.target.value || undefined }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Cadastro antes</label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filters.registered_before || ""}
                    onChange={(e) => setFilters((f) => ({ ...f, registered_before: e.target.value || undefined }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has_persona"
                  checked={!!filters.has_persona}
                  onCheckedChange={(v) => setFilters((f) => ({ ...f, has_persona: !!v }))}
                />
                <label htmlFor="has_persona" className="text-xs text-foreground cursor-pointer">
                  Apenas com persona de vinho definida
                </label>
              </div>
              <Button size="sm" onClick={applyFilters} className="w-full">
                <Filter className="w-3.5 h-3.5 mr-1.5" /> Aplicar filtros
              </Button>
            </div>
          )}

          {leadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {activeFilterCount > 0 ? "Nenhum lead encontrado com esses filtros" : "Nenhum lead cadastrado"}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Clique no link de cada lead para abrir o WhatsApp com a mensagem pronta:
              </p>
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[30vh]">
                {leads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between gap-2 border rounded-lg p-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.whatsapp}</p>
                    </div>
                    <a
                      href={generateWhatsAppLink(lead.whatsapp, sendingCampaign?.message || "")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" /> Enviar
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 border-t mt-2">
                <span className="text-sm text-muted-foreground">{leads.length} leads</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={sendToAll}>
                    <Users className="w-4 h-4 mr-2" /> Enviar para todos
                  </Button>
                  <Button onClick={markAsSent}>
                    <Send className="w-4 h-4 mr-2" /> Marcar como enviada
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
