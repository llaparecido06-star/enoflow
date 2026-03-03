import { Wine, UtensilsCrossed, ShoppingBag, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

interface BottomNavProps {
  slug: string;
  enabledModules?: string[];
}

export default function BottomNav({ slug, enabledModules }: BottomNavProps) {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const cpParam = searchParams.get("cp");
  const basePath = `/app/${slug}`;

  const allTabs = [
    { id: "tasting", label: t("nav.tasting"), icon: Wine, path: "", module: "tasting" },
    { id: "restaurant", label: t("nav.restaurant"), icon: UtensilsCrossed, path: "/restaurant", module: "restaurant" },
    { id: "shop", label: t("nav.shop"), icon: ShoppingBag, path: "/shop", module: "shop" },
    { id: "journey", label: t("nav.profile"), icon: Trophy, path: "/journey", module: null },
  ];

  const tabs = allTabs.filter(tab => tab.module === null || !enabledModules || enabledModules.includes(tab.module));
  const activeTab = tabs.find((tab) => location.pathname === basePath + tab.path)?.id ?? tabs[0]?.id;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50">
      <div className="flex items-center justify-around py-2.5 max-w-lg mx-auto relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(basePath + tab.path + (cpParam ? `?cp=${cpParam}` : ""))}
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
