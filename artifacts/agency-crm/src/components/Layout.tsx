import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  MessageSquareText,
  FileText,
  Package,
  Settings,
  Menu,
  MapPin,
  Sun,
  Moon,
  Search,
  Bell,
  BookOpen,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { useGetSettings } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-client";

const mainNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/panduan", label: "Panduan", icon: BookOpen },
  { href: "/prospecting", label: "Cari Prospek", icon: MapPin },
  { href: "/prospects", label: "Prospek", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/templates", label: "Template WA", icon: MessageSquareText },
  { href: "/invoices", label: "Invoice", icon: FileText },
  { href: "/packages", label: "Paket", icon: Package },
];

const preferenceNavItems = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

const navItems = [...mainNavItems, ...preferenceNavItems];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200"
      aria-label="Toggle theme"
    >
      <Sun className="h-[18px] w-[18px] scale-100 rotate-0 transition-all duration-300 dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[18px] w-[18px] scale-0 rotate-90 transition-all duration-300 dark:scale-100 dark:rotate-0" />
    </Button>
  );
}

function NavGroup({
  title,
  items,
  location,
  collapsed = false,
}: {
  title: string;
  items: typeof navItems;
  location: string;
  collapsed?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {!collapsed && (
        <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </span>
      )}
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} rounded-lg py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5"
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-200 ${!isActive && "group-hover:scale-110"}`} />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function getInitials(name?: string) {
  if (!name) return "WS";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "WS";
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: settings } = useGetSettings();
  const agencyName = settings?.agencyName || "Websensial";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("websensial:sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("websensial:sidebar-collapsed", String(sidebarCollapsed)); }
    catch { /* Persisting a UI preference is optional. */ }
  }, [sidebarCollapsed]);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Reload supaya state React Query dan halaman ikut dibersihkan.
      window.location.assign("/");
    }
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full min-h-0 flex-col gap-5 py-4">
      <div className={`flex items-center ${sidebarCollapsed && !mobile ? "justify-center px-2" : "justify-between px-4"} py-2`}>
        {(!sidebarCollapsed || mobile) && (
          <img
            src="/websensial-logo.png"
            alt="Websensial"
            className={`${mobile ? "h-16 w-16" : "h-20 w-20"} shrink-0 rounded-xl object-contain`}
          />
        )}
        {!mobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className="h-9 w-9 shrink-0"
            aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            title={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto ${sidebarCollapsed && !mobile ? "px-2" : "px-3"}`}>
        <NavGroup title="Menu Utama" items={mainNavItems} location={location} collapsed={sidebarCollapsed && !mobile} />
        <NavGroup title="Preferensi" items={preferenceNavItems} location={location} collapsed={sidebarCollapsed && !mobile} />
      </div>
      <div className={`flex items-center border-t border-border px-4 pt-3 ${sidebarCollapsed && !mobile ? "justify-center" : "justify-between"}`}>
        {(!sidebarCollapsed || mobile) && <span className="text-xs text-muted-foreground">Tema</span>}
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-background">
      <aside className={`sticky top-0 hidden h-[100dvh] shrink-0 flex-col border-r border-border bg-card/60 backdrop-blur-sm transition-[width] duration-200 md:flex ${sidebarCollapsed ? "w-[4.5rem]" : "w-64"}`}>
        <SidebarContent />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card/60 backdrop-blur-sm px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent mobile />
              </SheetContent>
            </Sheet>
            <img src="/websensial-logo.png" alt="Websensial" className="h-12 w-12 rounded-lg object-contain md:hidden" />
            <div className="hidden md:flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">Selamat datang, {agencyName} 👋</span>
              <span className="text-xs text-muted-foreground">Ringkasan aktivitas Crm hari ini.</span>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari apa saja…" className="pl-9 bg-background/60" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </Button>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(agencyName)}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
