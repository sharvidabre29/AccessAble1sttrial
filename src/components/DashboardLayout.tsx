import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, User, LogOut, LucideIcon, Settings } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import useUserPermissions from "@/hooks/useUserPermissions";
import NotificationDropdown from "@/components/NotificationDropdown";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  navItems: NavItem[];
  roleBadge: string;
  roleBadgeColor: string;
}

const DashboardLayout = ({ children, title, navItems, roleBadge, roleBadgeColor }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { role } = useUserPermissions();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 hidden md:flex">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoImg} alt="AccessAble logo" className="w-8 h-8 rounded-lg" />
            <span className="font-heading font-bold text-sidebar-foreground">AccessAble</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {/* Role-based rendering: strict per-role nav items */}
          {(
            // Strict role-based sidebar filtering. Use centralized `role` value from `useUserPermissions`.
            profile
              ? role === "individual"
                ? navItems.filter((i) => ["Dashboard", "Requests", "Profile", "Chats"].includes(i.label))
                : role === "organization"
                ? navItems.filter((i) => ["Dashboard", "Requests", "Volunteer Assignments", "Profile"].includes(i.label))
                : role === "volunteer"
                ? navItems.filter((i) => ["Dashboard", "Available Requests", "My Tasks", "Completed Tasks", "Profile", "Chats"].includes(i.label))
                : role === "donor"
                ? navItems.filter((i) => ["Dashboard", "Browse Organizations", "Chats", "Profile"].includes(i.label))
                : navItems
              : navItems
          ).map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {profile && (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">
              {profile.full_name || profile.email}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl font-bold text-foreground">{title}</h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", roleBadgeColor)}>{roleBadge}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown role={navItems[0]?.to.split("/")[2] || "individual"} />
            <Button variant="ghost" size="icon">
              <User className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
