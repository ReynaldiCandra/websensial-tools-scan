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
        toast({ title: "Status updated" });
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
        toast({ title: "Activity added" });
        setNewActivityNote("");
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey(prospectId) });
      }
    });
  };

  if (isProspectLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px]" /></div>;
  }

  if (!prospect) {
    return <div>Prospect not found</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/prospects">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4"/></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{prospect.businessName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{prospect.category}</Badge>
            <span className="text-sm text-muted-foreground capitalize">Source: {prospect.source}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle>Business Details</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Pipeline Stage:</span>
                  <Select value={prospect.status} onValueChange={handleStatusChange} disabled={updateStatus.isPending}>
                    <SelectTrigger className="w-[180px]">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3"/> Phone (WA)</p>
                  <p className="font-medium">{formatPhoneDisplay(prospect.phone)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/> Owner Name</p>
                  <p className="font-medium">{prospect.ownerName || "-"}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> Address</p>
                  <p className="font-medium">{prospect.address || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3"/> Website Status</p>
                  <p className="font-medium">{prospect.hasWebsite ? "Has Website" : "No Website"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3"/> Deal Value</p>
                  <p className="font-medium">{prospect.dealValue ? `Rp ${prospect.dealValue.toLocaleString('id-ID')}` : "-"}</p>
                </div>
              </div>
              {prospect.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{prospect.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="wa">
                <TabsList className="mb-4">
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
                      <label className="text-sm font-medium">Select WA Template</label>
                      <Select value={selectedTemplate?.toString()} onValueChange={(v) => setSelectedTemplate(parseInt(v, 10))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a template..." />
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

        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <div className="flex gap-2">
                  <Select value={newActivityType} onValueChange={setNewActivityType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="wa_sent">WA Sent</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="deal_closed">Deal Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea 
                  placeholder="Notes..." 
                  className="min-h-[80px]" 
                  value={newActivityNote}
                  onChange={(e) => setNewActivityNote(e.target.value)}
                />
                <Button size="sm" className="w-full" onClick={handleAddActivity} disabled={createActivity.isPending}>
                  Log Activity
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {isActivitiesLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : activities?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No activity logged.</p>
                ) : (
                  activities?.map((activity) => (
                    <div key={activity.id} className="relative pl-4 border-l-2 border-primary/20 pb-4 last:pb-0">
                      <div className="absolute w-2 h-2 bg-primary rounded-full -left-[5px] top-1.5" />
                      <div className="text-sm font-medium capitalize flex items-center justify-between">
                        {activity.type.replace('_', ' ')}
                        <span className="text-[10px] text-muted-foreground font-normal flex items-center gap-1">
                          <Clock className="h-3 w-3"/>
                          {new Date(activity.createdAt).toLocaleDateString()}
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
