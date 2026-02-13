import { Wine, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface BottomNavProps {
  slug: string;
}

const tabs = [
  { id: "tasting", label: "Degustação", icon: Wine, path: "" },
  { id: "restaurant", label: "Restaurante", icon: UtensilsCrossed, path: "/restaurant" },
  { id: "shop", label: "Loja", icon: ShoppingBag, path: "/shop" },
];

export default function BottomNav({ slug }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = `/app/${slug}`;

  const activeTab = tabs.find(
    (t) => location.pathname === basePath + t.path
  )?.id ?? "tasting";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(basePath + tab.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
