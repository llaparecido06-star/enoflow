import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, X, Wine } from "lucide-react";
import { invokeAuth } from "@/lib/auth-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface StaffNotif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  payload: any;
  voucher_id: string | null;
  capture_point_id: string | null;
  status: string;
  created_at: string;
  seen_at: string | null;
}

interface Props { adminId: string; wineryId: string }

export default function StaffSeparationBell({ adminId, wineryId }: Props) {
  const [items, setItems] = useState<StaffNotif[]>([]);
  const [open, setOpen] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data } = await invokeAuth("staff-notifications", { action: "list" });
    if (data?.success) {
      const list = (data.notifications ?? []) as StaffNotif[];
      setItems(list);
      list.forEach((i) => knownIds.current.add(i.id));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!adminId) return;
    const ch = supabase
      .channel(`staff-notif-${adminId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "staff_notifications",
        filter: `admin_id=eq.${adminId}`,
      }, (payload) => {
        const row = payload.new as StaffNotif;
        if (knownIds.current.has(row.id)) return;
        knownIds.current.add(row.id);
        setItems((prev) => [row, ...prev]);
        try {
          if (typeof window !== "undefined" && "Audio" in window) {
            const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          }
        } catch {}
        toast(row.title, { description: row.body ?? undefined, duration: 8000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [adminId]);

  const markDone = async (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "done" } : i));
    await invokeAuth("staff-notifications", { action: "set_status", ids: [id], status: "done" });
  };

  const pending = items.filter((i) => i.status !== "done");

  return (
    <div className="relative">
      <button
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (willOpen && pending.length) {
            const unseen = pending.filter((i) => !i.seen_at).map((i) => i.id);
            if (unseen.length) invokeAuth("staff-notifications", { action: "mark_seen", ids: unseen });
          }
        }}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
        aria-label="Notificações de separação"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {pending.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
            {pending.length > 9 ? "9+" : pending.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-elevated z-50 animate-scale-in">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2"><Wine className="w-4 h-4 text-amber-500" /> Separar vinhos</p>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-2 space-y-2">
              {pending.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma separação pendente.</p>
              )}
              {pending.map((n) => (
                <div key={n.id} className="border border-border rounded-xl p-3 bg-background">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      {n.body && <p className="text-[11px] text-muted-foreground mt-0.5">{n.body}</p>}
                      {n.payload?.code && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">{n.payload.code} · {n.payload?.location ?? ""}</p>
                      )}
                    </div>
                    <button
                      onClick={() => markDone(n.id)}
                      className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500 text-white font-medium flex items-center gap-1 hover:bg-emerald-600 transition-colors"
                    >
                      <Check className="w-3 h-3" /> Pronto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
