import { useMemo } from "react";
import { motion } from "framer-motion";

export default function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      size: 4 + Math.random() * 8,
      color: ['hsl(38, 70%, 50%)', 'hsl(350, 82%, 22%)', 'hsl(42, 80%, 60%)', 'hsl(0, 0%, 100%)'][Math.floor(Math.random() * 4)],
      rotation: Math.random() * 360,
    }))
  , []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '100vh', opacity: 0, rotate: p.rotation + 360 }}
          transition={{ delay: p.delay, duration: p.duration, ease: 'linear' }}
          style={{ position: 'absolute', width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.size > 8 ? '50%' : '2px' }}
        />
      ))}
    </div>
  );
}
