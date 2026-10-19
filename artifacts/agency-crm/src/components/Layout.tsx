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
} from "lucide-react";
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
}: {
  title: string;
  items: typeof navItems;
  location: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </span>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5"
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform duration-200 ${!isActive && "group-hover:scale-110"}`} />
                {item.label}
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

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Reload supaya state React Query dan halaman ikut dibersihkan.
      window.location.assign("/");
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-6 py-4">
      <div className="flex items-center justify-between px-4 py-3">
        <img
          src="/websensial-logo.png"
          alt="Websensial"
          className="h-9 w-auto object-contain"
        />
      </div>
      <div className="flex-1 flex flex-col gap-6 px-3">
        <NavGroup title="Menu Utama" items={mainNavItems} location={location} />
        <NavGroup title="Preferensi" items={preferenceNavItems} location={location} />
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 pt-3">
        <span className="text-xs text-muted-foreground">Tema</span>
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-card/60 backdrop-blur-sm md:flex">
        <SidebarContent />
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
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
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <img src="/websensial-logo.png" alt="Websensial" className="h-7 w-auto object-contain md:hidden" />
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

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
