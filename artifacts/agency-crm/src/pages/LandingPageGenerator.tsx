import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Search, Sparkles, WandSparkles } from "lucide-react";
import { useListProspects, type Prospect } from "@workspace/api-client-react";
import { PreviewGenerator } from "@/components/PreviewGenerator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPhoneDisplay } from "@/lib/phone";

function prospectLabel(prospect: Prospect) {
  return `${prospect.businessName} · ${prospect.category}`;
}

export function LandingPageGenerator() {
  const { data: prospects, isLoading, isError } = useListProspects();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const visibleProspects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return (prospects ?? []).filter((prospect) =>
      `${prospect.businessName} ${prospect.category} ${prospect.phone}`.toLocaleLowerCase("id-ID").includes(query),
    );
  }, [prospects, search]);
  const selectedProspect = visibleProspects.find((prospect) => String(prospect.id) === selectedId)
    ?? visibleProspects[0];

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-7">
      <div className="ws-page-heading">
        <div>
          <p className="ws-eyebrow">Studio website</p>
          <h1>Landing Page Generator</h1>
          <p>Buat preview website satu halaman yang siap ditinjau dan dibagikan ke calon klien.</p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Generator preview
        </Badge>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200/80 bg-blue-50/70 px-3 py-2.5 text-xs leading-5 text-blue-900" role="note">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" />
        <p>Copy awal dapat dibuat otomatis dengan AI. Tinjau kembali informasi, warna, dan aset sebelum membagikan preview.</p>
      </div>

      <Card className="ws-card min-w-0">
        <CardHeader className="gap-2 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><WandSparkles className="h-4 w-4" /></span>
            <div>
              <CardTitle className="ws-section-title">Pilih bisnis yang akan dibuatkan preview</CardTitle>
              <CardDescription className="mt-1 text-xs">Data bisnis dan nomor kontak diambil dari daftar prospek tersimpan.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
              Daftar prospek gagal dimuat. Muat ulang halaman atau buka kembali setelah koneksi tersedia.
            </div>
          ) : prospects?.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold">Belum ada prospek tersimpan</p><p className="mt-1 text-xs text-muted-foreground">Tambahkan prospek dahulu agar preview dapat terhubung dengan data bisnis yang sebenarnya.</p></div>
              <Button asChild className="h-10 gap-2 rounded-lg"><Link href="/prospecting">Cari Prospek <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="generator-prospect-search">Cari prospek</Label>
                <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="generator-prospect-search" className="h-10 rounded-lg pl-9" placeholder="Nama bisnis, kategori, nomor…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="generator-prospect-select">Pilih bisnis</Label>
                <Select value={selectedProspect ? String(selectedProspect.id) : ""} onValueChange={setSelectedId}>
                  <SelectTrigger id="generator-prospect-select" className="h-10 rounded-lg"><SelectValue placeholder="Pilih prospek" /></SelectTrigger>
                  <SelectContent>
                    {visibleProspects.map((prospect) => <SelectItem key={prospect.id} value={String(prospect.id)}>{prospectLabel(prospect)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {visibleProspects.length === 0 && <p className="text-xs text-muted-foreground md:col-span-2">Tidak ada prospek yang cocok dengan pencarian.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProspect && !isLoading && !isError && (
        <div className="flex min-w-0 flex-col gap-5">
          <div className="min-w-0">
            <PreviewGenerator
              prospectId={selectedProspect.id}
              businessName={selectedProspect.businessName}
              category={selectedProspect.category}
              phone={selectedProspect.phone}
            />
          </div>
          <Card className="ws-card h-fit min-w-0 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center">
            <CardHeader className="pb-3"><CardTitle className="ws-section-title">Ringkasan bisnis</CardTitle><CardDescription>Informasi prospek yang digunakan generator.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">Nama bisnis</p><p className="mt-1 break-words text-sm font-semibold">{selectedProspect.businessName}</p></div>
              <div><p className="text-xs text-muted-foreground">Kategori</p><p className="mt-1 text-sm font-medium">{selectedProspect.category}</p></div>
              <div><p className="text-xs text-muted-foreground">Nomor kontak</p><p className="mt-1 text-sm font-medium">{formatPhoneDisplay(selectedProspect.phone) || "Belum tersedia"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status website</p><Badge variant="outline" className="mt-1">{selectedProspect.hasWebsite ? "Sudah memiliki website" : "Belum memiliki website"}</Badge></div>
              <Button asChild variant="outline" className="h-10 w-full gap-2 rounded-lg"><Link href={`/prospects/${selectedProspect.id}`}>Buka detail prospek <ArrowRight className="h-4 w-4" /></Link></Button>
              <p className="text-[11px] leading-5 text-muted-foreground">Preview yang dibuat akan tersimpan pada riwayat preview prospek ini. Aksi generate, buka preview, salin link, dan WhatsApp tetap memakai alur yang sudah ada.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
