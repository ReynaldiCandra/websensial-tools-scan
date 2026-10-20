import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useGetDashboardSummary,
  useGetDashboardPipeline,
  useGetDashboardRecentActivity,
  getGetDashboardSummaryQueryKey,
  getGetDashboardPipelineQueryKey,
  getGetDashboardRecentActivityQueryKey,
} from "@workspace/api-client-react";
import type { ActivityWithProspect, DashboardSummary } from "@workspace/api-client-react";
import { Activity, Users, DollarSign, Target, PhoneCall, MessageCircle, MonitorPlay, FileCheck2, Sparkles, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardPipelineChart = lazy(() => import("@/components/DashboardPipelineChart").then((module) => ({ default: module.DashboardPipelineChart })));

function DeferredPipelineChart({ pipeline }: { pipeline: import("@workspace/api-client-react").PipelineSummary }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="min-h-[240px]">
      {shouldLoad ? (
        <Suspense fallback={<Skeleton className="h-[240px] w-full" />}>
          <DashboardPipelineChart pipeline={pipeline} />
        </Suspense>
      ) : (
        <Skeleton className="h-[240px] w-full" />
      )}
    </div>
  );
}

const statCards = [
  {
    key: "totalProspects",
    label: "Total Prospek",
    icon: Users,
    color: "text-blue-600 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-400/10",
    format: (summary: DashboardSummary) => summary.totalProspects,
    sub: (summary: DashboardSummary) => `+${summary.thisMonthProspects} bulan ini`,
  },
  {
    key: "totalDeals",
    label: "Deal Diclose",
    icon: Target,
    color: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10",
    format: (summary: DashboardSummary) => summary.totalDeals,
    sub: (summary: DashboardSummary) => `+${summary.thisMonthDeals} bulan ini`,
  },
  {
    key: "totalRevenue",
    label: "Pendapatan",
    icon: DollarSign,
    color: "text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/10",
    format: (summary: DashboardSummary) => `Rp ${summary.totalRevenue.toLocaleString("id-ID")}`,
    sub: () => "Nilai semua transaksi tercatat",
  },
  {
    key: "conversionRate",
    label: "Tingkat Konversi",
    icon: Activity,
    color: "text-violet-600 bg-violet-500/10 dark:text-violet-400 dark:bg-violet-400/10",
    format: (summary: DashboardSummary) => `${summary.conversionRate.toFixed(1)}%`,
    sub: () => "Deal atas tiap prospek",
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

function QueryError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <AlertTitle>Data belum dapat dimuat</AlertTitle>
          <AlertDescription>Periksa koneksi Anda, lalu coba muat ulang data dashboard.</AlertDescription>
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>Coba lagi</Button>
    </Alert>
  );
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const summaryQuery = useGetDashboardSummary();
  const pipelineQuery = useGetDashboardPipeline();
  const activitiesQuery = useGetDashboardRecentActivity();
  const { data: summary, isLoading: isLoadingSummary, isError: isSummaryError } = summaryQuery;
  const { data: pipeline, isLoading: isLoadingPipeline, isError: isPipelineError } = pipelineQuery;
  const { data: activities, isLoading: isLoadingActivities, isError: isActivitiesError } = activitiesQuery;

  const retrySummary = () => void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  const retryPipeline = () => void queryClient.invalidateQueries({ queryKey: getGetDashboardPipelineQueryKey() });
  const retryActivities = () => void queryClient.invalidateQueries({ queryKey: getGetDashboardRecentActivityQueryKey() });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Ringkasan pipeline prospek dan aktivitas terbaru Anda.</p>
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
                ) : isSummaryError || !summary ? (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">Data gagal dimuat.</p>
                    <Button type="button" variant="outline" size="sm" onClick={retrySummary}>Coba lagi</Button>
                  </div>
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
            <CardTitle>Ringkasan Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPipeline ? (
              <Skeleton className="h-[240px] w-full" />
            ) : isPipelineError || !pipeline ? (
              <div className="flex h-[240px] items-center">
                <QueryError onRetry={retryPipeline} />
              </div>
            ) : (
              <DeferredPipelineChart pipeline={pipeline} />
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivities ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isActivitiesError || !activities ? (
              <QueryError onRetry={retryActivities} />
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada aktivitas. Saatnya beraksi!
              </div>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity: ActivityWithProspect) => {
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
                          {activity.type.replace('_', ' ').toUpperCase()} • {formatActivityDate(activity.createdAt)}
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
