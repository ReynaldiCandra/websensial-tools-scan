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
