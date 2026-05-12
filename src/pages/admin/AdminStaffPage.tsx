import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { Users, Plus, Pencil, Trash2, X, Loader2, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  staff: "Funcionário",
  sales: "Atendente (CRM)",
  manager: "Gerente",
  owner: "Dono",
  master: "Master",
};

const roleIcons: Record<string, typeof Shield> = {
  staff: Shield,
  manager: ShieldCheck,
  owner: ShieldAlert,
};

export default function AdminStaffPage() {
  const { winery, admin } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeAuth("admin-staff", { action: "list" });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStaff(data.staff ?? []);
    } catch {
      toast.error("Erro ao carregar equipe");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openCreate = () => {
    setEditStaff(null);
    setForm({ name: "", email: "", password: "", role: "staff" });
    setShowForm(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditStaff(member);
    setForm({ name: member.name, email: member.email, password: "", role: member.role });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    if (!editStaff && (!form.password || form.password.length < 6)) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      if (editStaff) {
        const { data, error } = await invokeAuth("admin-staff", {
          action: "update",
          target_id: editStaff.id,
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password || undefined,
          role: form.role,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Funcionário atualizado!");
      } else {
        const { data, error } = await invokeAuth("admin-staff", {
          action: "create",
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Funcionário adicionado!");
      }
      setShowForm(false);
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleDelete = async () => {
    if (!deleteStaff) return;
    setDeleting(true);
    try {
      const { data, error } = await invokeAuth("admin-staff", {
        action: "delete",
        target_id: deleteStaff.id,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Funcionário removido!");
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover");
    } finally {
      setDeleting(false);
      setDeleteStaff(null);
    }
  };

  const canEdit = (member: StaffMember) => member.role !== "owner" && member.role !== "master" && member.id !== admin.id;

  const toggleActive = async (member: StaffMember) => {
    try {
      const { data, error } = await invokeAuth("admin-staff", {
        action: "toggle_status",
        target_id: member.id,
        is_active: !member.is_active,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(member.is_active ? "Usuário desativado" : "Usuário ativado");
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar status");
    }
  };

  const activeCount = staff.filter(s => s.is_active).length;
  const managerCount = staff.filter(s => s.role === "manager").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2"><Users className="w-7 h-7 text-primary" />Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os funcionários da vinícola</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium shadow-card hover:shadow-elevated hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo funcionário
        </button>
      </div>

      {!loading && staff.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="admin-kpi p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</p><p className="text-2xl font-bold mt-1">{staff.length}</p></div>
          <div className="admin-kpi p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ativos</p><p className="text-2xl font-bold mt-1 text-emerald-600">{activeCount}</p></div>
          <div className="admin-kpi p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Gerentes</p><p className="text-2xl font-bold mt-1 text-primary">{managerCount}</p></div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : staff.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum funcionário cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => {
            const RoleIcon = roleIcons[member.role] || Shield;
            return (
              <div key={member.id} className="admin-card admin-card-hover p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <RoleIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{member.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      member.role === "owner" ? "bg-gold/10 text-gold" :
                      member.role === "manager" ? "bg-primary/10 text-primary" :
                      "bg-secondary text-secondary-foreground"
                    }`}>
                      {roleLabels[member.role] || member.role}
                    </span>
                    {!member.is_active && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        Inativo
                      </span>
                    )}
                    {canEdit(member) && (
                      <>
                        <button
                          onClick={() => toggleActive(member)}
                          className={`p-1.5 rounded-lg transition-colors ${member.is_active ? "hover:bg-destructive/10" : "hover:bg-green-500/10"}`}
                          title={member.is_active ? "Desativar" : "Ativar"}
                        >
                          <Shield className={`w-3.5 h-3.5 ${member.is_active ? "text-green-500" : "text-destructive"}`} />
                        </button>
                        <button onClick={() => openEdit(member)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => setDeleteStaff(member)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md mx-4 rounded-2xl border border-border animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold">
                {editStaff ? "Editar Funcionário" : "Novo Funcionário"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-secondary">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Nome *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={100}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">E-mail *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} maxLength={255}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Senha {editStaff ? "(deixe vazio para manter)" : "*"}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} maxLength={100}
                  placeholder={editStaff ? "••••••" : ""}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Nível de Acesso *</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="staff">Funcionário — Apenas vouchers</option>
                  <option value="sales">Atendente — Acesso só ao CRM (leads atribuídos)</option>
                  <option value="manager">Gerente — Vinhos, pacotes e cardápio</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-border flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {editStaff ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteStaff && (
        <DeleteConfirmModal
          title="Remover funcionário"
          message={`Tem certeza que deseja remover "${deleteStaff.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteStaff(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
