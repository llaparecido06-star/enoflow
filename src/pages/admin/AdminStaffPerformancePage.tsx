import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { Winery } from "@/hooks/useWinery";
import type { AdminUser } from "@/hooks/useAdminAuth";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { Loader2, Users, Activity, Receipt, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface StaffPerformance {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  login_count_30d: number;
  voucher_validations_30d: number;
  last_login: string | null;
  total_actions_30d: number;
}

interface PerformanceStats {
  total_vouchers_redeemed: number;
  total_voucher_value: number;
  unique_clients: number;
}

export default function AdminStaffPerformancePage() {
  const { winery } = useOutletContext<{ winery: Winery; admin: AdminUser }>();
  const [staff, setStaff] = useState<StaffPerformance[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await invokeAuth("admin-staff-activity", { action: "performance" });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setStaff(data.staff ?? []);
        setStats(data.stats ?? null);
      } catch {
        toast.error("Erro ao carregar dados de performance");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cur = winery.currency || "BRL";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Performance da Equipe</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o desempenho dos funcionários nos últimos 30 dias</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Global Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Receipt className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="font-display text-2xl font-bold text-foreground">{stats.total_vouchers_redeemed}</p>
                <p className="text-[10px] text-muted-foreground">Vouchers resgatados</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="font-display text-2xl font-bold text-foreground">{formatCurrency(stats.total_voucher_value, cur)}</p>
                <p className="text-[10px] text-muted-foreground">Valor total</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="font-display text-2xl font-bold text-foreground">{stats.unique_clients}</p>
                <p className="text-[10px] text-muted-foreground">Clientes únicos</p>
              </div>
            </div>
          )}

          {/* Staff Table */}
          <div className="space-y-3">
            {staff.map((member) => (
              <div key={member.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{member.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  {!member.is_active && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Inativo</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-foreground">{member.login_count_30d}</p>
                    <p className="text-[9px] text-muted-foreground">Logins</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-foreground">{member.voucher_validations_30d}</p>
                    <p className="text-[9px] text-muted-foreground">Vouchers validados</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-foreground">{member.total_actions_30d}</p>
                    <p className="text-[9px] text-muted-foreground">Ações totais</p>
                  </div>
                </div>

                {member.last_login && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Último login: {new Date(member.last_login).toLocaleString("pt-BR")}
                  </div>
                )}
                {!member.last_login && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Nunca logou nos últimos 30 dias
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
