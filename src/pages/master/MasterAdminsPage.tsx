import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { MasterAdmin } from "@/hooks/useMasterAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  winery_id: string;
  created_at: string;
}

interface WineryOption {
  id: string;
  name: string;
  slug: string;
}

const roleLabels: Record<string, string> = {
  staff: "Funcionário",
  manager: "Gerente",
  owner: "Dono",
  master: "Master",
};

const roleColors: Record<string, string> = {
  staff: "bg-secondary text-foreground",
  manager: "bg-primary/10 text-primary",
  owner: "bg-accent/10 text-accent",
  master: "bg-destructive/10 text-destructive",
};

export default function MasterAdminsPage() {
  const { admin } = useOutletContext<{ admin: MasterAdmin }>();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [wineries, setWineries] = useState<WineryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff", winery_id: "" });

  const fetchAdmins = async () => {
    try {
      const res = await supabase.functions.invoke("master-dashboard", {
        body: { admin_id: admin.id, action: "list_admins" },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      setAdmins(res.data.admins ?? []);
      setWineries(res.data.wineries ?? []);
    } catch {
      toast.error("Erro ao carregar admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, [admin.id]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: "", email: "", password: "", role: "staff", winery_id: wineries[0]?.id ?? "" });
    setModalOpen(true);
  };

  const openEdit = (a: AdminUser) => {
    setEditTarget(a);
    setForm({ name: a.name, email: a.email, password: "", role: a.role, winery_id: a.winery_id });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        const res = await supabase.functions.invoke("master-dashboard", {
          body: {
            admin_id: admin.id,
            action: "update_admin",
            target_id: editTarget.id,
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            role: form.role,
          },
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Admin atualizado!");
      } else {
        if (!form.password) { toast.error("Senha obrigatória"); setSaving(false); return; }
        const res = await supabase.functions.invoke("master-dashboard", {
          body: { admin_id: admin.id, action: "create_admin", ...form },
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Admin criado!");
      }
      setModalOpen(false);
      fetchAdmins();
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
      const res = await supabase.functions.invoke("master-dashboard", {
        body: { admin_id: admin.id, action: "delete_admin", target_id: deleteTarget.id },
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Admin removido!");
      setDeleteTarget(null);
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    } finally {
      setSaving(false);
    }
  };

  const wineryName = (id: string) => wineries.find(w => w.id === id)?.name ?? "—";

  const filtered = admins.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    wineryName(a.winery_id).toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="font-display text-2xl font-bold text-foreground">Administradores</h1>
          <p className="text-sm text-muted-foreground">{admins.length} admins na plataforma</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Novo Admin
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou vinícola..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(a => (
          <div key={a.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{a.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{a.email} · {wineryName(a.winery_id)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleColors[a.role] || "bg-secondary text-foreground"}`}>
                {roleLabels[a.role] || a.role}
              </span>
              {a.role !== "master" && (
                <>
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum admin encontrado</p>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Admin" : "Novo Admin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>{editTarget ? "Nova Senha (deixe vazio para manter)" : "Senha"}</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div>
              <Label>Cargo</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Funcionário</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="owner">Dono</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!editTarget && (
              <div>
                <Label>Vinícola</Label>
                <Select value={form.winery_id} onValueChange={v => setForm(f => ({ ...f, winery_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {wineries.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.email}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editTarget ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Admin</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
