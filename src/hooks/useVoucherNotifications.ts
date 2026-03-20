import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Subscribes to realtime voucher redemptions for a given winery.
 * Shows a toast notification when a voucher is redeemed.
 * Only active for owner and manager roles.
 */
export function useVoucherNotifications(wineryId: string | undefined, enabled: boolean) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!wineryId || !enabled) return;

    const channel = supabase
      .channel(`voucher-notifications-${wineryId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vouchers",
          filter: `winery_id=eq.${wineryId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;

          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          // Only notify when voucher transitions from not-redeemed to redeemed
          if (newRow.redeemed === true && oldRow.redeemed === false) {
            const total = Number(newRow.total || 0).toFixed(2);
            const code = newRow.code || "—";

            toast.success(`🎉 Voucher resgatado!`, {
              description: `Código: ${code} · Total: R$ ${total}`,
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wineryId, enabled]);
}
