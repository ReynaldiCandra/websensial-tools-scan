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
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospecting", label: "Prospecting", icon: MapPin },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/templates", label: "WA Templates", icon: MessageSquareText },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/packages", label: "Packages", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

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

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="flex items-center justify-between px-4 py-3">
        <img
          src="/websensial-logo.png"
          alt="Websensial"
          className="h-9 w-auto object-contain"
        />
      </div>
      <div className="flex-1 px-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
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
      <div className="flex items-center justify-between border-t border-border px-4 pt-3">
        <span className="text-xs text-muted-foreground">Theme</span>
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
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-card/60 backdrop-blur-sm px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <img src="/websensial-logo.png" alt="Websensial" className="h-7 w-auto object-contain" />
          </div>
          <ThemeToggle />
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
