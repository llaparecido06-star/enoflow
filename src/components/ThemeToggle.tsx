import { forwardRef } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const ThemeToggle = forwardRef<HTMLButtonElement, { className?: string }>(
  ({ className = "" }, ref) => {
    const { isDark, toggle } = useTheme();

    return (
      <button
        ref={ref}
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
);

ThemeToggle.displayName = "ThemeToggle";

export default ThemeToggle;
