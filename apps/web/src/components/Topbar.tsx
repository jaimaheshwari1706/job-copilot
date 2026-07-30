import { Bell, LogOut, Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "../stores/auth.store";
import { useLogout } from "../features/auth/auth.api";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="h-14 shrink-0 border-b border-border bg-surface px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <Search size={16} className="text-slate-400" />
        <input
          type="search"
          placeholder="Search jobs, companies, skills..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-surface-muted transition-colors"
        >
          <Bell size={18} />
        </button>
        <ThemeToggle />
        <div
          title={user?.email}
          className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary"
        >
          {initial}
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Log out"
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-surface-muted transition-colors disabled:opacity-50"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
