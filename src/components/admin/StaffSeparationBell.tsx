import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, X, Wine, Settings2 } from "lucide-react";
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
  done_at?: string | null;
}

interface Props { adminId: string; wineryId: string }

const REMINDER_KEY = (wineryId: string) => `staff-sep-reminder-min:${wineryId}`;

export default function StaffSeparationBell({ adminId, wineryId }: Props) {
  const [items, setItems] = useState<StaffNotif[]>([]);
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reminderMin, setReminderMin] = useState<number>(() => {
    if (typeof window === "undefined") return 5;
    const v = Number(localStorage.getItem(REMINDER_KEY(wineryId)));
    return Number.isFinite(v) && v >= 1 ? v : 5;
  });
  const lastReminderAt = useRef<Map<string, number>>(new Map());

  const upsertOne = useCallback((row: StaffNotif) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === row.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], ...row };
        return next;
      }
      return [row, ...prev];
    });
  }, []);

  const load = useCallback(async () => {
    const { data } = await invokeAuth("staff-notifications", { action: "list" });
    if (data?.success) {
      const list = (data.notifications ?? []) as StaffNotif[];
      // Dedup by id (defensive)
      const map = new Map<string, StaffNotif>();
      list.forEach((i) => map.set(i.id, i));
      setItems(Array.from(map.values()).sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      ));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription — INSERT and UPDATE
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
        let isNew = false;
        setItems((prev) => {
          if (prev.some((i) => i.id === row.id)) return prev;
          isNew = true;
          return [row, ...prev];
        });
        if (isNew) {
          try {
            if (typeof window !== "undefined" && "Audio" in window) {
              const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
              audio.volume = 0.5;
              audio.play().catch(() => {});
            }
          } catch {}
          toast(row.title, { description: row.body ?? undefined, duration: 8000 });
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "staff_notifications",
        filter: `admin_id=eq.${adminId}`,
      }, (payload) => {
        const row = payload.new as StaffNotif;
        upsertOne(row);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [adminId, upsertOne]);

  // Reminder loop: toast pending items older than reminderMin minutes, once per window
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const thresholdMs = reminderMin * 60 * 1000;
      items.forEach((n) => {
        if (n.status === "done") return;
        const created = +new Date(n.created_at);
        if (now - created < thresholdMs) return;
        const last = lastReminderAt.current.get(n.id) ?? 0;
        if (now - last < thresholdMs) return;
        lastReminderAt.current.set(n.id, now);
        const minutesAgo = Math.floor((now - created) / 60000);
        toast.warning(`⏰ Pendente há ${minutesAgo} min`, {
          description: n.title,
          duration: 7000,
        });
      });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [items, reminderMin]);

  const updateReminder = (val: number) => {
    const v = Math.max(1, Math.min(120, Math.round(val)));
    setReminderMin(v);
    try { localStorage.setItem(REMINDER_KEY(wineryId), String(v)); } catch {}
  };

  const markDone = async (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "done", done_at: new Date().toISOString() } : i));
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
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowSettings(false); }} />
          <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-elevated z-50 animate-scale-in">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2"><Wine className="w-4 h-4 text-amber-500" /> Separar vinhos</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className="p-1 rounded hover:bg-secondary"
                  aria-label="Configurar lembrete"
                  title="Configurar lembrete"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-secondary"><X className="w-4 h-4" /></button>
              </div>
            </div>
            {showSettings && (
              <div className="p-3 border-b border-border bg-secondary/40">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Lembrar a cada (minutos) quando pendente
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={reminderMin}
                  onChange={(e) => updateReminder(Number(e.target.value))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background"
                />
              </div>
            )}
            <div className="p-2 space-y-2">
              {pending.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma separação pendente.</p>
              )}
              {pending.map((n) => {
                const ageMin = Math.floor((Date.now() - +new Date(n.created_at)) / 60000);
                const overdue = ageMin >= reminderMin;
                return (
                  <div key={n.id} className={`border rounded-xl p-3 bg-background ${overdue ? "border-amber-400 ring-1 ring-amber-200" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        {n.body && <p className="text-[11px] text-muted-foreground mt-0.5">{n.body}</p>}
                        {n.payload?.code && (
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono">{n.payload.code} · {n.payload?.location ?? ""}</p>
                        )}
                        <p className={`text-[10px] mt-1 ${overdue ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                          {ageMin <= 0 ? "agora" : `há ${ageMin} min`}{overdue ? " · atrasado" : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => markDone(n.id)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500 text-white font-medium flex items-center gap-1 hover:bg-emerald-600 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Pronto
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
