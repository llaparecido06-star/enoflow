import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Mail, Phone, Building2, MessageSquare, Loader2, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MasterLeadsPage() {
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["landing-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.winery_name ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Leads B2B</h1>
        <p className="text-sm text-muted-foreground">
          Contatos capturados pelo formulário da landing page
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou vinícola..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="shrink-0">
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Inbox className="w-10 h-10 mb-3" />
          <p className="font-medium">Nenhum lead encontrado</p>
          <p className="text-sm">Os contatos aparecerão aqui quando o formulário for preenchido.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Vinícola</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <a href={`mailto:${lead.email}`} className="hover:text-foreground transition-colors">
                          {lead.email}
                        </a>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.winery_name ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {lead.winery_name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    {lead.message ? (
                      <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{lead.message}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(lead.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
