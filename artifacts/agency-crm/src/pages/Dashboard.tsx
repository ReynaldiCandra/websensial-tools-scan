import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
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
    <div className="flex flex-col gap-6 sm:gap-7">
      <div className="ws-page-heading">
        <div>
          <p className="ws-eyebrow">Ringkasan workspace</p>
          <h1>Dashboard</h1>
          <p>Pantau prospek, aktivitas penjualan, dan performa tim Anda dalam satu tempat.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild className="h-10 gap-2 rounded-lg px-4"><Link href="/prospecting"><Users className="h-4 w-4" />Cari Prospek</Link></Button>
          <Button asChild variant="outline" className="h-10 gap-2 rounded-lg px-4"><Link href="/pipeline"><Target className="h-4 w-4" />Lihat Pipeline</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} className="ws-card min-w-0">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-1 sm:px-5 sm:pt-5">
                <CardTitle className="pt-1 text-xs font-medium leading-4 text-muted-foreground sm:text-[13px]">{stat.label}</CardTitle>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="sm:px-5 sm:pb-5">
                {isLoadingSummary ? (
                  <Skeleton className="h-8 w-24" />
                ) : isSummaryError || !summary ? (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">Data gagal dimuat.</p>
                    <Button type="button" variant="outline" size="sm" onClick={retrySummary}>Coba lagi</Button>
                  </div>
                ) : (
                  <>
                    <div className="break-words text-xl font-semibold tracking-tight sm:text-[26px]">{stat.format(summary)}</div>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">{stat.sub(summary)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-7">
        <Card className="ws-card min-w-0 xl:col-span-4">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle className="ws-section-title">Ringkasan Pipeline</CardTitle><p className="mt-1 text-xs text-muted-foreground">Prospek berdasarkan tahapan penjualan</p></div>
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs"><Link href="/pipeline">Lihat detail <Target className="h-3.5 w-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
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

        <Card className="ws-card min-w-0 xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle className="ws-section-title">Aktivitas Terbaru</CardTitle><p className="mt-1 text-xs text-muted-foreground">Interaksi terakhir dengan prospek</p></div>
            <Activity className="h-4 w-4 text-muted-foreground" />
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
              <div className="flex min-h-44 flex-col items-center justify-center py-8 text-center">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Activity className="h-5 w-5" /></span>
                <p className="text-sm font-medium text-foreground">Belum ada aktivitas.</p>
                <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">Aktivitas prospek akan tampil di sini setelah Anda mulai menghubungi mereka.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity: ActivityWithProspect) => {
                  const { Icon, color } = activityIconFor(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start gap-3 border-b border-border/70 pb-4 last:border-0 last:pb-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none mb-1 truncate">
                          {activity.prospectName || activity.businessName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.type.replace('_', ' ').toUpperCase()} · {formatActivityDate(activity.createdAt)}
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
