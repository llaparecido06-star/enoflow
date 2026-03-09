import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { invokeAuth } from "@/lib/auth-api";
import { formatCurrency } from "@/lib/currency";
import { Loader2, QrCode, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface RoiItem {
  id: string;
  name: string;
  category: string;
  leads: number;
  conversions: number;
  revenue: number;
  conversion_rate: string;
  avg_ticket: string;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "all", label: "Todo o período" },
];

export default function RoiCapturePointsTab({ currency }: { currency: string }) {
  const [period, setPeriod] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["roi-capture-points", period],
    queryFn: async () => {
      const payload: Record<string, unknown> = { action: "roi_capture_points" };
      if (period !== "all") payload.days = Number(period);
      const res = await invokeAuth("admin-reports", payload);
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return (res.data?.roi_capture_points ?? []) as RoiItem[];
    },
  });

  const items = data ?? [];

  const chartData = items.map((i) => ({
    name: i.name.length > 18 ? i.name.slice(0, 16) + "…" : i.name,
    Receita: i.revenue,
    Leads: i.leads,
  }));

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Filtre o ROI por período de análise
        </p>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !items.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <QrCode className="w-12 h-12 opacity-40" />
          <p className="text-sm">Nenhum ponto de captura com dados neste período.</p>
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-display text-base font-semibold text-foreground">
                Receita por Ponto de Captura
              </h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) =>
                      name === "Receita" ? formatCurrency(value, currency) : value
                    }
                  />
                  <Bar dataKey="Receita" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ponto de Captura</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conversões</TableHead>
                  <TableHead className="text-right">Taxa Conv.</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{item.category}</TableCell>
                    <TableCell className="text-right">{item.leads}</TableCell>
                    <TableCell className="text-right">{item.conversions}</TableCell>
                    <TableCell className="text-right">{item.conversion_rate}%</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.revenue, currency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.avg_ticket), currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
