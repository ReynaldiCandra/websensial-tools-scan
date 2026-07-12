#!/usr/bin/env bash
set -e
# Jalankan script ini dari ROOT folder repo websensial-tools-scan
if [ ! -f "vercel.json" ]; then echo "Error: jalankan script ini dari root repo (folder yang ada vercel.json)"; exit 1; fi

echo "-> Menulis artifacts/agency-crm/src/components/Layout.tsx"
cat > artifacts/agency-crm/src/components/Layout.tsx << 'LAYOUT_EOF'
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
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/theme-provider";
import { useGetSettings } from "@workspace/api-client-react";

const mainNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospecting", label: "Prospecting", icon: MapPin },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/templates", label: "WA Templates", icon: MessageSquareText },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/packages", label: "Packages", icon: Package },
];

const preferenceNavItems = [
  { href: "/settings", label: "Settings", icon: Settings },
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
        <NavGroup title="Main Menu" items={mainNavItems} location={location} />
        <NavGroup title="Preferences" items={preferenceNavItems} location={location} />
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
              <span className="text-sm font-semibold truncate">Welcome back, {agencyName} 👋</span>
              <span className="text-xs text-muted-foreground">Here's what's happening today.</span>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search anything" className="pl-9 bg-background/60" />
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
LAYOUT_EOF

echo "-> Menulis artifacts/agency-crm/src/pages/Dashboard.tsx"
cat > artifacts/agency-crm/src/pages/Dashboard.tsx << 'DASH_EOF'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardSummary, useGetDashboardPipeline, useGetDashboardRecentActivity } from "@workspace/api-client-react";
import { Activity, Users, DollarSign, Target, PhoneCall, MessageCircle, MonitorPlay, FileCheck2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

const statCards = [
  {
    key: "totalProspects",
    label: "Total Prospects",
    icon: Users,
    color: "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-400/10",
    format: (summary: any) => summary?.totalProspects ?? 0,
    sub: (summary: any) => `+${summary?.thisMonthProspects ?? 0} this month`,
  },
  {
    key: "totalDeals",
    label: "Deals Closed",
    icon: Target,
    color: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10",
    format: (summary: any) => summary?.totalDeals ?? 0,
    sub: (summary: any) => `+${summary?.thisMonthDeals ?? 0} this month`,
  },
  {
    key: "totalRevenue",
    label: "Revenue",
    icon: DollarSign,
    color: "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/10",
    format: (summary: any) => `Rp ${(summary?.totalRevenue ?? 0).toLocaleString("id-ID")}`,
    sub: () => "Lifetime value tracked",
  },
  {
    key: "conversionRate",
    label: "Conversion Rate",
    icon: Activity,
    color: "text-violet-600 bg-violet-500/10 dark:text-violet-400 dark:bg-violet-400/10",
    format: (summary: any) => `${summary?.conversionRate?.toFixed(1) ?? 0}%`,
    sub: () => "Deals per prospect",
  },
];

const activityIconFor = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes("call")) return { Icon: PhoneCall, color: "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-400/10" };
  if (t.includes("wa") || t.includes("message") || t.includes("chat")) return { Icon: MessageCircle, color: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10" };
  if (t.includes("demo")) return { Icon: MonitorPlay, color: "text-violet-600 bg-violet-500/10 dark:text-violet-400 dark:bg-violet-400/10" };
  if (t.includes("invoice") || t.includes("deal") || t.includes("selesai")) return { Icon: FileCheck2, color: "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/10" };
  return { Icon: Sparkles, color: "text-muted-foreground bg-muted" };
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} prospek</p>
    </div>
  );
}

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: pipeline, isLoading: isLoadingPipeline } = useGetDashboardPipeline();
  const { data: activities, isLoading: isLoadingActivities } = useGetDashboardRecentActivity();

  const chartData = [
    { label: "Belum Dihubungi", value: pipeline?.belumDihubungi || 0 },
    { label: "Dihubungi", value: pipeline?.dihubungi || 0 },
    { label: "Demo", value: pipeline?.demo || 0 },
    { label: "Deal", value: pipeline?.deal || 0 },
    { label: "Invoice", value: pipeline?.invoice || 0 },
    { label: "Selesai", value: pipeline?.selesai || 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your prospecting pipeline and recent activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stat.format(summary)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub(summary)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPipeline ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="24%">
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={40}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.08)" }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivities ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : activities?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity. Time to hustle!
              </div>
            ) : (
              <div className="space-y-4">
                {activities?.slice(0, 5).map((activity) => {
                  const { Icon, color } = activityIconFor(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none mb-1 truncate">
                          {activity.prospectName || activity.businessName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.type.replace('_', ' ').toUpperCase()} • {new Date(activity.createdAt).toLocaleDateString()}
                        </p>
                        {activity.notes && (
                          <p className="text-xs mt-1 text-muted-foreground/80 line-clamp-2">{activity.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
DASH_EOF

echo "-> Menjalankan typecheck..."
pnpm run typecheck

echo "-> Commit & push ke branch feat/dashboard-redesign"
git checkout -b feat/dashboard-redesign 2>/dev/null || git checkout feat/dashboard-redesign
git add artifacts/agency-crm/src/components/Layout.tsx artifacts/agency-crm/src/pages/Dashboard.tsx
git commit -m "feat: redesign dashboard - colored stat icons, recharts pipeline chart, top header, grouped sidebar nav"
git push -u origin feat/dashboard-redesign

echo ""
echo "Selesai. Buka GitHub untuk buat Pull Request dari feat/dashboard-redesign ke main, atau langsung: git checkout main && git merge feat/dashboard-redesign && git push origin main"
