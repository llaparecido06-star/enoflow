import { Wine, UtensilsCrossed, ShoppingBag, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface BottomNavProps {
  slug: string;
}

const tabs = [
  { id: "tasting", label: "Degustação", icon: Wine, path: "" },
  { id: "restaurant", label: "Restaurante", icon: UtensilsCrossed, path: "/restaurant" },
  { id: "shop", label: "Loja", icon: ShoppingBag, path: "/shop" },
  { id: "journey", label: "Jornada", icon: Trophy, path: "/journey" },
];

export default function BottomNav({ slug }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/app/${slug}`;

  const activeTab = tabs.find((t) => location.pathname === basePath + t.path)?.id ?? "tasting";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-center justify-around py-2.5 max-w-lg mx-auto relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(basePath + tab.path)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors duration-300"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-2.5 w-8 h-0.5 rounded-full bg-gold"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-gold" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-gold" : "text-muted-foreground"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
