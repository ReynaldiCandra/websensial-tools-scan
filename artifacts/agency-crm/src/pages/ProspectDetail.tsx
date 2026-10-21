import { useParams } from "wouter";
import { 
  useGetProspect, 
  useUpdateProspectStatus, 
  useListActivities, 
  useCreateActivity,
  useListTemplates,
  useRenderTemplate,
  getGetProspectQueryKey,
  getListActivitiesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, MapPin, Globe, User, Clock, ArrowLeft, MessageSquare, FileText, Wand2 } from "lucide-react";
import { PreviewGenerator } from "@/components/PreviewGenerator";
import { formatPhoneDisplay } from "@/lib/phone";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

const STAGES = [
  { id: "belum_dihubungi", label: "Belum Dihubungi" },
  { id: "dihubungi", label: "Dihubungi" },
  { id: "demo", label: "Demo" },
  { id: "deal", label: "Deal" },
  { id: "invoice", label: "Invoice" },
  { id: "selesai", label: "Selesai" },
];

export function ProspectDetail() {
  const { id } = useParams<{ id: string }>();
  const prospectId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prospect, isLoading: isProspectLoading } = useGetProspect(prospectId, {
    query: { enabled: !!prospectId, queryKey: getGetProspectQueryKey(prospectId) }
  });

  const { data: activities, isLoading: isActivitiesLoading } = useListActivities(prospectId, {
    query: { enabled: !!prospectId, queryKey: getListActivitiesQueryKey(prospectId) }
  });

  const { data: templates } = useListTemplates();

  const updateStatus = useUpdateProspectStatus();
  const createActivity = useCreateActivity();
  const renderTemplate = useRenderTemplate();

  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [newActivityNote, setNewActivityNote] = useState("");
  const [newActivityType, setNewActivityType] = useState("follow_up");

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ id: prospectId, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status prospek diperbarui." });
        queryClient.invalidateQueries({ queryKey: getGetProspectQueryKey(prospectId) });
      }
    });
  };

  const handleSendWA = async () => {
    if (!selectedTemplate) return;
    
    renderTemplate.mutate({ id: selectedTemplate, data: { prospectId } }, {
      onSuccess: (data) => {
        window.open(data.waUrl, "_blank");
        // Log activity
        createActivity.mutate({ id: prospectId, data: { type: "wa_sent", notes: `Sent template: ${templates?.find(t => t.id === selectedTemplate)?.name}` } }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(prospectId) });
          }
        });
      },
      onError: (e) => {
        toast({
          title: "Tidak bisa membuka WhatsApp",
          description: (e as Error).message,
          variant: "destructive",
        });
      }
    });
  };

  const handleAddActivity = () => {
    createActivity.mutate({ id: prospectId, data: { type: newActivityType, notes: newActivityNote } }, {
      onSuccess: () => {
        toast({ title: "Aktivitas berhasil dicatat." });
        setNewActivityNote("");
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(prospectId) });
      }
    });
  };

  if (isProspectLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px]" /></div>;
  }

  if (!prospect) {
    return <div className="ws-card p-6 text-sm text-muted-foreground">Prospek tidak ditemukan.</div>;
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-7">
      <div className="flex min-w-0 items-start gap-3">
        <Link href="/prospects">
          <Button variant="outline" size="icon" className="mt-1 h-9 w-9 rounded-lg"><ArrowLeft className="h-4 w-4"/><span className="sr-only">Kembali ke prospek</span></Button>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="ws-eyebrow">Detail prospek</p>
          <h1 className="mt-1 break-words text-[1.65rem] font-semibold tracking-tight sm:text-3xl">{prospect.businessName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{prospect.category}</Badge>
            <span className="text-xs text-muted-foreground">Sumber: {prospect.source === "gmaps" ? "Google Maps" : prospect.source === "manual" ? "Manual" : prospect.source}</span>
            <Badge variant="outline">{prospect.hasWebsite ? "Sudah ada website" : "Belum ada website"}</Badge>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 space-y-5 xl:col-span-2">
          <Card className="ws-card min-w-0">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="ws-section-title">Informasi bisnis</CardTitle>
                <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Tahap pipeline</span>
                  <Select value={prospect.status} onValueChange={handleStatusChange} disabled={updateStatus.isPending}>
                    <SelectTrigger className="h-10 w-full rounded-lg sm:w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map(stage => (
                        <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3"/> Nomor WhatsApp</p>
                  <p className="font-medium">{formatPhoneDisplay(prospect.phone)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/> Pemilik / PIC</p>
                  <p className="font-medium">{prospect.ownerName || "-"}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/> Alamat</p>
                  <p className="break-words font-medium">{prospect.address || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3.5 w-3.5"/> Status website</p>
                  {prospect.currentWebsite ? <a href={prospect.currentWebsite} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-primary hover:underline">{prospect.currentWebsite}</a> : <p className="text-sm font-medium">{prospect.hasWebsite ? "Sudah ada website" : "Belum ada website"}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3"/> Nilai deal</p>
                  <p className="font-medium">{prospect.dealValue ? `Rp ${prospect.dealValue.toLocaleString('id-ID')}` : "-"}</p>
                </div>
              </div>
              {prospect.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-1">Catatan</p>
                  <p className="text-sm text-muted-foreground">{prospect.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="ws-card min-w-0">
            <CardHeader>
              <CardTitle className="ws-section-title">Aksi komunikasi</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="wa">
                <TabsList className="mb-4 h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-muted/70 p-1 sm:w-auto">
                  <TabsTrigger value="wa" className="gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Kirim WA
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Wand2 className="h-3.5 w-3.5" />
                    Preview Website
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="wa">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium">Pilih template WhatsApp</label>
                      <Select value={selectedTemplate?.toString()} onValueChange={(v) => setSelectedTemplate(parseInt(v, 10))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih template pesan" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates?.map(t => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleSendWA} 
                      disabled={!selectedTemplate || renderTemplate.isPending}
                      className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Kirim WA
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="preview">
                  <PreviewGenerator
                    prospectId={prospectId}
                    businessName={prospect.businessName}
                    category={prospect.category}
                    phone={prospect.phone}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="ws-card flex h-full min-w-0 flex-col">
            <CardHeader className="pb-2">
              <CardTitle>Riwayat aktivitas</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <div className="flex gap-2">
                  <Select value={newActivityType} onValueChange={setNewActivityType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Telepon</SelectItem>
                      <SelectItem value="wa_sent">WhatsApp terkirim</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="follow_up">Tindak lanjut</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="deal_closed">Deal ditutup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea 
                  placeholder="Catatan aktivitas…"
                  className="min-h-[80px]" 
                  value={newActivityNote}
                  onChange={(e) => setNewActivityNote(e.target.value)}
                />
                <Button size="sm" className="w-full" onClick={handleAddActivity} disabled={createActivity.isPending}>
                  Catat aktivitas
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {isActivitiesLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : activities?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada aktivitas.</p>
                ) : (
                  activities?.map((activity) => (
                    <div key={activity.id} className="relative pl-4 border-l-2 border-primary/20 pb-4 last:pb-0">
                      <div className="absolute w-2 h-2 bg-primary rounded-full -left-[5px] top-1.5" />
                      <div className="text-sm font-medium capitalize flex items-center justify-between">
                        {activity.type.replace('_', ' ')}
                        <span className="text-[10px] text-muted-foreground font-normal flex items-center gap-1">
                          <Clock className="h-3 w-3"/>
                          {new Date(activity.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {activity.notes && (
                        <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-2 rounded-md">
                          {activity.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
