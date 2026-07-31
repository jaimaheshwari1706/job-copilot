import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Sparkles,
  Bookmark,
  Bell,
  FileText,
  BarChart3,
  MessagesSquare,
  KanbanSquare,
  User,
  Settings,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Job Search",
    items: [
      { to: "/jobs", label: "Discover Jobs", icon: Search },
      { to: "/jobs/recommended", label: "Recommended", icon: Sparkles },
      { to: "/jobs/saved", label: "Saved Jobs", icon: Bookmark },
      { to: "/jobs/analyze", label: "Analyze a JD", icon: ScanSearch },
      { to: "/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    title: "Career",
    items: [
      { to: "/resume", label: "Resume", icon: FileText },
      { to: "/skills", label: "Skill Analysis", icon: BarChart3 },
      { to: "/interview", label: "Interview Prep", icon: MessagesSquare },
    ],
  },
  {
    title: "Applications",
    items: [{ to: "/applications", label: "Tracker", icon: KanbanSquare }],
  },
  {
    title: "Account",
    items: [
      { to: "/profile", label: "Profile", icon: User },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  return (
    <nav className="w-64 shrink-0 border-r border-border bg-surface px-3 py-4 hidden md:flex md:flex-col gap-6 overflow-y-auto">
      <div className="px-3 text-lg font-semibold tracking-tight">Job Copilot</div>
      {NAV_GROUPS.map((group) => (
        <div key={group.title ?? "root"} className="flex flex-col gap-1">
          {group.title && (
            <div className="px-3 text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
              {group.title}
            </div>
          )}
          {group.items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-slate-600 dark:text-slate-300 hover:bg-surface-muted"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
