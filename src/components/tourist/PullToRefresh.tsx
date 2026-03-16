import { useState, useRef, useCallback, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 60], [0, 1]);
  const scale = useTransform(y, [0, 60], [0.5, 1]);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const diff = Math.max(0, (e.touches[0].clientY - startY.current) * 0.4);
    if (diff > 0) {
      y.set(Math.min(diff, 80));
    }
  }, [y]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const currentY = y.get();
    if (currentY >= 60) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch {}
      setRefreshing(false);
    }
    animate(y, 0, { duration: 0.3 });
  }, [y, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        style={{ opacity, scale }}
        className="flex justify-center py-2"
      >
        <Loader2 className={`w-5 h-5 text-gold ${refreshing ? "animate-spin" : ""}`} />
      </motion.div>
      {children}
    </div>
  );
}
