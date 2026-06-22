import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardSummary, useGetDashboardPipeline, useGetDashboardRecentActivity } from "@workspace/api-client-react";
import { Activity, Users, DollarSign, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: pipeline, isLoading: isLoadingPipeline } = useGetDashboardPipeline();
  const { data: activities, isLoading: isLoadingActivities } = useGetDashboardRecentActivity();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your prospecting pipeline and recent activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{summary?.totalProspects || 0}</div>
                <p className="text-xs text-muted-foreground">+{summary?.thisMonthProspects || 0} this month</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals Closed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{summary?.totalDeals || 0}</div>
                <p className="text-xs text-muted-foreground">+{summary?.thisMonthDeals || 0} this month</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">Rp {(summary?.totalRevenue || 0).toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Lifetime value tracked</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">{summary?.conversionRate?.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground">Deals per prospect</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPipeline ? <Skeleton className="h-[200px] w-full" /> : (
              <div className="flex h-[200px] items-end gap-2">
                {[
                  { label: "Belum Dihubungi", value: pipeline?.belumDihubungi || 0 },
                  { label: "Dihubungi", value: pipeline?.dihubungi || 0 },
                  { label: "Demo", value: pipeline?.demo || 0 },
                  { label: "Deal", value: pipeline?.deal || 0 },
                  { label: "Invoice", value: pipeline?.invoice || 0 },
                  { label: "Selesai", value: pipeline?.selesai || 0 },
                ].map((stage, i) => {
                  const max = Math.max(
                    pipeline?.belumDihubungi || 0,
                    pipeline?.dihubungi || 0,
                    pipeline?.demo || 0,
                    pipeline?.deal || 0,
                    pipeline?.invoice || 0,
                    pipeline?.selesai || 0,
                    1
                  );
                  const height = `${(stage.value / max) * 100}%`;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2 group">
                      <div className="w-full bg-primary/20 rounded-t-sm relative flex justify-center group-hover:bg-primary/30 transition-colors" style={{ height }}>
                        <span className="absolute -top-6 text-sm font-medium">{stage.value}</span>
                      </div>
                      <div className="text-xs text-center text-muted-foreground leading-tight px-1 h-8 break-words flex items-start justify-center">
                        {stage.label}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                {activities?.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium leading-none mb-1">
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
