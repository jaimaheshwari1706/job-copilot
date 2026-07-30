import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../stores/theme.store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-surface-muted transition-colors"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
