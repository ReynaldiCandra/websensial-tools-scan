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
import { Search, Plus, MapPin, Phone, Globe, ArrowUpRight } from "lucide-react";
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
        toast({ title: "Prospek berhasil ditambahkan." });
        queryClient.invalidateQueries({ queryKey: getListProspectsQueryKey() });
        setIsSheetOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Gagal menambahkan prospek", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="ws-page-heading">
        <div>
          <p className="ws-eyebrow">Akuisisi pelanggan</p>
          <h1>Prospek</h1>
          <p>Kelola calon klien dan pantau langkah berikutnya dalam proses penjualan.</p>
        </div>
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button className="h-10 gap-2 rounded-lg">
              <Plus className="h-4 w-4" />
              Tambah prospek
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Tambah Prospek</SheetTitle>
            </SheetHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama bisnis</FormLabel>
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
                      <FormLabel>Nama pemilik (opsional)</FormLabel>
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
                      <FormLabel>Nomor WhatsApp</FormLabel>
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
                      <FormLabel>Kategori bisnis</FormLabel>
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
                      <FormLabel>Sumber prospek</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih sumber" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Input manual</SelectItem>
                          <SelectItem value="gmaps">Google Maps</SelectItem>
                          <SelectItem value="referral">Referensi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-6" disabled={createProspect.isPending}>
                  {createProspect.isPending ? "Menyimpan…" : "Simpan prospek"}
                </Button>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Cari nama, kategori, atau nomor…"
            aria-label="Cari prospek"
            className="h-10 rounded-lg pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="ws-card overflow-hidden">
        <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bisnis</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tahap</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
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
                  Belum ada prospek. Tambahkan prospek untuk mulai mengelola pipeline.
                </TableCell>
              </TableRow>
            ) : (
              prospects?.map((prospect) => (
                <TableRow key={prospect.id} className="text-[13px]">
                  <TableCell>
                    <div className="font-medium text-primary hover:underline">
                      <Link href={`/prospects/${prospect.id}`}>
                        {prospect.businessName}
                      </Link>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {formatPhoneDisplay(prospect.phone)}</span>
                      {prospect.hasWebsite && <span className="flex items-center gap-1"><Globe className="h-3 w-3"/> Ada website</span>}
                    </div>
                  </TableCell>
                  <TableCell>{prospect.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${STAGES[prospect.status]?.color || "bg-slate-100 text-slate-700"} border-transparent hover:bg-transparent`}>
                      {STAGES[prospect.status]?.label || prospect.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">{prospect.source === "gmaps" ? "Google Maps" : prospect.source === "manual" ? "Manual" : prospect.source}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/prospects/${prospect.id}`}>
                      <Button variant="ghost" size="sm">Lihat</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
        <div className="divide-y divide-border md:hidden">
          {isLoading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="space-y-3 p-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /><Skeleton className="h-6 w-24" /></div>) : prospects?.length === 0 ? <div className="p-6 text-center"><p className="text-sm font-medium">Belum ada prospek.</p><p className="mt-1 text-xs text-muted-foreground">Tambahkan prospek untuk mulai membangun pipeline.</p></div> : prospects?.map((prospect) => <Link key={prospect.id} href={`/prospects/${prospect.id}`} className="flex min-w-0 items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/40"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{prospect.businessName}</span><span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground"><span className="truncate">{prospect.category}</span><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhoneDisplay(prospect.phone)}</span></span><span className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className={`${STAGES[prospect.status]?.color || "bg-slate-100 text-slate-700"} border-transparent`}>{STAGES[prospect.status]?.label || prospect.status}</Badge>{prospect.hasWebsite && <Badge variant="secondary">Ada website</Badge>}<span className="text-[10px] capitalize text-muted-foreground">{prospect.source === "gmaps" ? "Google Maps" : prospect.source === "manual" ? "Manual" : prospect.source}</span></span></span><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}
        </div>
      </div>
    </div>
  );
}
