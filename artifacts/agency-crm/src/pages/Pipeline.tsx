import { useListProspects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "wouter";
import { Phone, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STAGES = [
  { id: "belum_dihubungi", label: "Belum Dihubungi", color: "border-slate-200 bg-slate-50" },
  { id: "dihubungi", label: "Dihubungi", color: "border-blue-200 bg-blue-50" },
  { id: "demo", label: "Demo", color: "border-purple-200 bg-purple-50" },
  { id: "deal", label: "Deal", color: "border-indigo-200 bg-indigo-50" },
  { id: "invoice", label: "Invoice", color: "border-amber-200 bg-amber-50" },
  { id: "selesai", label: "Selesai", color: "border-green-200 bg-green-50" },
];

export function Pipeline() {
  const { data: prospects, isLoading } = useListProspects();

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground mt-1">Track deals across stages.</p>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {STAGES.map((stage) => {
          const columnProspects = prospects?.filter(p => p.status === stage.id) || [];
          
          return (
            <div key={stage.id} className={`flex-shrink-0 w-80 rounded-lg border ${stage.color} flex flex-col h-[calc(100vh-200px)]`}>
              <div className="p-3 border-b border-inherit bg-white/50 backdrop-blur-sm sticky top-0 font-medium flex justify-between items-center rounded-t-lg">
                <span className="text-sm font-bold text-slate-700">{stage.label}</span>
                <span className="bg-white/80 text-xs px-2 py-0.5 rounded-full border shadow-sm">
                  {isLoading ? "-" : columnProspects.length}
                </span>
              </div>
              <div className="p-2 flex-1 overflow-y-auto space-y-3">
                {isLoading ? (
                  <Skeleton className="h-24 w-full rounded-md bg-white/50" />
                ) : columnProspects.length === 0 ? (
                  <div className="text-center p-4 text-xs text-slate-400">Empty</div>
                ) : (
                  columnProspects.map(prospect => (
                    <Link key={prospect.id} href={`/prospects/${prospect.id}`}>
                      <Card className="hover:border-primary cursor-pointer transition-colors shadow-sm hover:shadow-md">
                        <CardContent className="p-3">
                          <div className="font-semibold text-sm mb-1">{prospect.businessName}</div>
                          <div className="text-xs text-muted-foreground flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {prospect.phone}
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
