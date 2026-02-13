import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-lg hover:bg-muted transition-colors ${className}`}
      aria-label={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-gold" />
      ) : (
        <Moon className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );
}
