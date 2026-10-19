import { useState } from "react";
import { Link } from "wouter";
import { 
  useListProspects, 
  useCreateProspect,
  getListProspectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Search, Plus, MapPin, Phone, Globe } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneDisplay } from "@/lib/phone";

const STAGES: Record<string, { label: string; color: string }> = {
  belum_dihubungi: { label: "Belum Dihubungi", color: "bg-slate-200 text-slate-700" },
  dihubungi: { label: "Dihubungi", color: "bg-blue-100 text-blue-700" },
  demo: { label: "Demo", color: "bg-purple-100 text-purple-700" },
  deal: { label: "Deal", color: "bg-indigo-100 text-indigo-700" },
  invoice: { label: "Invoice", color: "bg-amber-100 text-amber-700" },
  selesai: { label: "Selesai", color: "bg-green-100 text-green-700" },
};

const formSchema = z.object({
  businessName: z.string().min(1, "Required"),
  ownerName: z.string().optional(),
  phone: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  source: z.string().default("manual"),
  status: z.string().default("belum_dihubungi"),
  hasWebsite: z.boolean().default(false),
  address: z.string().optional(),
  currentWebsite: z.string().optional(),
});

export function Prospects() {
  const [search, setSearch] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { data: prospects, isLoading } = useListProspects({ search: search || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createProspect = useCreateProspect();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      ownerName: "",
      phone: "",
      category: "",
      source: "manual",
      status: "belum_dihubungi",
      hasWebsite: false,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createProspect.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Prospect created successfully." });
        queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() });
        setIsSheetOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Failed to create prospect", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prospects</h1>
          <p className="text-muted-foreground mt-1">Manage your leads and client acquisition.</p>
        </div>
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Prospect
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Add New Prospect</SheetTitle>
            </SheetHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Warung Kopi Senja" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Budi Santoso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (WA)</FormLabel>
                      <FormControl>
                        <Input placeholder="081234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="F&B, Retail, Services..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                          <SelectItem value="gmaps">Google Maps</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-6" disabled={createProspect.isPending}>
                  {createProspect.isPending ? "Creating..." : "Create Prospect"}
                </Button>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search prospects..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : prospects?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No prospects found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              prospects?.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell>
                    <div className="font-medium text-primary hover:underline">
                      <Link href={`/prospects/${prospect.id}`}>
                        {prospect.businessName}
                      </Link>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {formatPhoneDisplay(prospect.phone)}</span>
                      {prospect.hasWebsite && <span className="flex items-center gap-1"><Globe className="h-3 w-3"/> Web</span>}
                    </div>
                  </TableCell>
                  <TableCell>{prospect.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${STAGES[prospect.status]?.color || "bg-slate-100 text-slate-700"} border-transparent hover:bg-transparent`}>
                      {STAGES[prospect.status]?.label || prospect.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">{prospect.source}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/prospects/${prospect.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
