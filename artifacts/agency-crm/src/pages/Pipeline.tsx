import { useListProspects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "wouter";
import { Phone, MapPin, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPhoneDisplay } from "@/lib/phone";

const STAGES = [
  { id: "belum_dihubungi", label: "Belum Dihubungi", color: "border-slate-200 bg-slate-50/80" },
  { id: "dihubungi", label: "Dihubungi", color: "border-blue-200 bg-blue-50/70" },
  { id: "demo", label: "Demo", color: "border-violet-200 bg-violet-50/70" },
  { id: "deal", label: "Deal", color: "border-indigo-200 bg-indigo-50/70" },
  { id: "invoice", label: "Invoice", color: "border-amber-200 bg-amber-50/70" },
  { id: "selesai", label: "Selesai", color: "border-emerald-200 bg-emerald-50/70" },
];

export function Pipeline() {
  const { data: prospects, isLoading } = useListProspects();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="ws-page-heading">
        <div>
          <p className="ws-eyebrow">Alur penjualan</p>
          <h1>Pipeline</h1>
          <p>Pantau setiap prospek dari kontak pertama hingga deal selesai.</p>
        </div>
        <div className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs text-muted-foreground"><Users className="h-4 w-4" />{isLoading ? "Memuat prospek…" : `${prospects?.length ?? 0} prospek`}</div>
      </div>
      
      <div className="flex min-w-0 gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const columnProspects = prospects?.filter(p => p.status === stage.id) || [];
          
          return (
            <div key={stage.id} className={`flex h-[min(620px,calc(100dvh-250px))] min-h-[360px] w-[min(82vw,290px)] shrink-0 flex-col overflow-hidden rounded-xl border ${stage.color}`}>
              <div className="sticky top-0 flex items-center justify-between border-b border-inherit bg-white/80 p-3 font-medium backdrop-blur-sm">
                <span className="text-xs font-semibold text-foreground sm:text-sm">{stage.label}</span>
                <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[11px] text-muted-foreground">
                  {isLoading ? "-" : columnProspects.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {isLoading ? (
                  <Skeleton className="h-24 w-full rounded-md bg-white/50" />
                ) : columnProspects.length === 0 ? (
                  <div className="text-center p-4 text-xs text-slate-400">Belum ada prospek</div>
                ) : (
                  columnProspects.map(prospect => (
                    <Link key={prospect.id} href={`/prospects/${prospect.id}`}>
                      <Card className="ws-card cursor-pointer transition-colors hover:border-primary/40 hover:shadow-sm">
                        <CardContent className="p-3">
                          <div className="font-semibold text-sm mb-1">{prospect.businessName}</div>
                          <div className="text-xs text-muted-foreground flex flex-col gap-1">
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" /> <span className="truncate">{formatPhoneDisplay(prospect.phone)}</span>
                            </span>
                            <span className="inline-flex flex-wrap gap-1 mt-1">
                              <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 text-[10px] uppercase font-medium">{prospect.category}</span>
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
