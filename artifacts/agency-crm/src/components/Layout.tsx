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
  BookOpen,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

const generatorNavItems = [
  { href: "/landing-page-generator", label: "Landing Page Generator", icon: Sparkles },
];

const preferenceNavItems = [
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

const navItems = [...mainNavItems, ...generatorNavItems, ...preferenceNavItems];

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
  onNavigate,
}: {
  title: string;
  items: typeof navItems;
  location: string;
  collapsed?: boolean;
  onNavigate?: () => void;
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
          const isActive = location === item.href || (item.href === "/prospects" && location.startsWith("/prospects/"));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                title={collapsed ? item.label : undefined}
                onClick={onNavigate}
                className={`group relative flex min-h-10 items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} rounded-lg text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
  const [location, navigate] = useLocation();
  const { data: settings } = useGetSettings();
  const agencyName = settings?.agencyName || "Websensial";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("websensial:sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("websensial:sidebar-collapsed", String(sidebarCollapsed)); }
    catch { /* Persisting a UI preference is optional. */ }
  }, [sidebarCollapsed]);

  const pageTitle = useMemo(() => navItems.find((item) => item.href === location)?.label ?? (location.startsWith("/prospects/") ? "Detail Prospek" : "Websensial"), [location]);
  const searchMatches = useMemo(() => {
    const query = globalSearch.trim().toLocaleLowerCase("id-ID");
    return query ? navItems.filter((item) => item.label.toLocaleLowerCase("id-ID").includes(query)).slice(0, 5) : [];
  }, [globalSearch]);

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
          <div className="flex min-w-0 items-center gap-3">
            <img src="/websensial-logo.png" alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold tracking-[0.12em] text-foreground">WEBSENSIAL</div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">Tools Scan & CRM</div>
            </div>
          </div>
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
        <NavGroup title="Menu Utama" items={mainNavItems} location={location} collapsed={sidebarCollapsed && !mobile} onNavigate={() => setMobileOpen(false)} />
        <NavGroup title="Generate Website" items={generatorNavItems} location={location} collapsed={sidebarCollapsed && !mobile} onNavigate={() => setMobileOpen(false)} />
        <NavGroup title="Preferensi" items={preferenceNavItems} location={location} collapsed={sidebarCollapsed && !mobile} onNavigate={() => setMobileOpen(false)} />
      </div>
      <div className={`flex items-center border-t border-border px-4 pt-3 ${sidebarCollapsed && !mobile ? "justify-center" : "justify-between"}`}>
        {(!sidebarCollapsed || mobile) && <span className="text-xs text-muted-foreground">Tema</span>}
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-background">
      <aside className={`sticky top-0 hidden h-[100dvh] shrink-0 flex-col border-r border-border bg-white transition-[width] duration-200 md:flex ${sidebarCollapsed ? "w-[4.5rem]" : "w-[15rem]"}`}>
        <SidebarContent />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Buka navigasi">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Buka menu navigasi</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(18rem,86vw)] p-0">
                <SidebarContent mobile />
              </SheetContent>
            </Sheet>
            <div className="hidden min-w-0 md:flex md:flex-col">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><span>Workspace</span><ChevronRight className="h-3 w-3" /><span className="font-medium text-foreground">{pageTitle}</span></div>
              <span className="mt-1 truncate text-xs text-muted-foreground">Selamat datang, {agencyName}</span>
            </div>
          </div>

          <div className="relative hidden w-full max-w-[340px] flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Cari halaman"
              placeholder="Cari halaman…"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchMatches[0]) { navigate(searchMatches[0].href); setGlobalSearch(""); }
                if (event.key === "Escape") setGlobalSearch("");
              }}
              className="h-10 rounded-lg border-border bg-background pl-9 text-[13px] placeholder:text-muted-foreground/75"
            />
            {searchMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-border bg-popover p-1.5 shadow-lg" role="listbox" aria-label="Hasil halaman">
                {searchMatches.map((item) => {
                  const Icon = item.icon;
                  return <button key={item.href} type="button" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { navigate(item.href); setGlobalSearch(""); }}><Icon className="h-4 w-4 text-muted-foreground" />{item.label}</button>;
                })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-xs font-semibold text-primary sm:flex" aria-label={`Akun ${agencyName}`}>
              {getInitials(agencyName)}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
