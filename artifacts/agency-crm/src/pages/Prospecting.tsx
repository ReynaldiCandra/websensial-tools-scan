import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Search, MapPin, Globe, CheckCircle2, Star,
  RefreshCw, AlertTriangle, ExternalLink, MessageCircle, ChevronDown, X, Upload, FileText, WifiOff, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { parseBusinessCsv } from "@/lib/csv";

/**
 * Baca respons API tanpa pernah melempar error JSON.parse yang membingungkan.
 * Di production, platform hosting bisa mengembalikan halaman teks/HTML ketika
 * function timeout atau crash (contoh: "A server error has occurred").
 */
async function readApiResponse(res: Response): Promise<Record<string, unknown>> {
  const body = await res.text();

  if (!body.trim()) {
    throw new Error(
      res.ok
        ? "Server mengembalikan respons kosong. Coba lagi."
        : `Server error (HTTP ${res.status}). Coba lagi sebentar lagi.`,
    );
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "Server mengembalikan respons yang tidak valid. Coba lagi."
        : `Server error (HTTP ${res.status}). Coba lagi sebentar lagi.`,
    );
  }
}

const CITIES = [
  "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Semarang",
  "Medan", "Denpasar", "Makassar", "Palembang", "Bogor",
  "Depok", "Tangerang", "Bekasi", "Malang", "Solo",
  "Padang", "Manado", "Pontianak", "Balikpapan", "Pekanbaru",
];

const CATEGORIES = [
  "Kuliner", "Salon & Kecantikan", "Otomotif", "Fashion", "Kesehatan",
  "Apotek", "Fotografi", "Laundry", "Catering", "Hotel & Penginapan",
  "Pendidikan", "Toko Elektronik", "Toko Material", "Percetakan", "Furniture",
  "Jasa Umum", "Gym & Kebugaran", "Pet Shop & Hewan", "Servis Elektronik",
];

interface SearchResult {
  name: string;
  phone: string;
  address: string | null;
  category: string;
  hasWebsite: boolean;
  website: string | null;
  mapsUrl: string | null;
  osm_id: number;
  placeId?: string | null;
  rating?: string | null;
  reviewCount?: string | null;
  ownerName?: string | null;
  currentWebsite?: string | null;
}

export function Prospecting() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Search state
  const [city, setCity] = useState("Jakarta");
  const [category, setCategory] = useState("Kuliner");
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchMeta, setSearchMeta] = useState<{
    city: string;
    category: string;
    total: number;
    source?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  // CSV import state
  const [csvText, setCsvText] = useState("");
  const [csvParsed, setCsvParsed] = useState<SearchResult[]>([]);
  const [csvSelected, setCsvSelected] = useState<Set<number>>(new Set());

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSelected(new Set());

    try {
      const params = new URLSearchParams({ city, category, onlyNoWebsite: String(onlyNoWebsite) });
      const res = await apiFetch(`/api/prospecting/search?${params}`);
      const json = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : `Pencarian gagal (HTTP ${res.status})`,
        );
      }
      if (!Array.isArray(json.results)) {
        throw new Error("Format respons pencarian tidak valid. Coba lagi.");
      }
      setResults(json.results as SearchResult[]);
      setSearchMeta({
        city: String(json.city ?? city),
        category: String(json.category ?? category),
        total: Number(json.total ?? 0),
        source: typeof json.source === "string" ? json.source : undefined,
      });
    } catch (e: unknown) {
      const message =
        e instanceof TypeError
          ? "Tidak bisa menghubungi server. Pastikan API berjalan (jalankan `npm run dev`)."
          : (e as Error).message;
      setError(message || "Pencarian gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [city, category, onlyNoWebsite]);

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (!results) return;
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((_, i) => i)));
  };

  const handleImport = async (items: SearchResult[], selectedIdx: Set<number>) => {
    const toImport = [...selectedIdx].map((i) => items[i]).filter(Boolean);
    if (!toImport.length) {
      toast({ title: "Pilih minimal 1 bisnis", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const res = await apiFetch(`/api/prospecting/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospects: toImport.map((r) => ({
            businessName: r.name,
            phone: r.phone || "",
            address: r.address ?? undefined,
            category: r.category,
            hasWebsite: r.hasWebsite,
            mapsUrl: r.mapsUrl ?? undefined,
            rating: r.rating ?? undefined,
            reviewCount: r.reviewCount ?? undefined,
            ownerName: r.ownerName ?? undefined,
            currentWebsite: r.currentWebsite ?? undefined,
          })),
        }),
      });
      const json = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : `Import gagal (HTTP ${res.status})`,
        );
      }
      const skipped =
        Number(json.skippedDuplicatesInBatch ?? 0) + Number(json.skippedExisting ?? 0);
      toast({
        title: `${Number(json.imported ?? 0)} bisnis berhasil diimport ke pipeline!`,
        description: skipped > 0 ? `${skipped} duplikat dilewati otomatis.` : undefined,
      });
      navigate("/prospects");
    } catch (e: unknown) {
      toast({ title: "Import gagal", description: (e as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // CSV Parser — auto-maps header exports from browser extensions, and falls
  // back to the positional layout (name, phone, address, category, mapsUrl).
  const parseCSV = (text: string) => {
    const businesses = parseBusinessCsv(text);
    const parsed: SearchResult[] = businesses.map((b, i) => ({
      name: b.name,
      phone: b.phone,
      address: b.address,
      category: b.category,
      hasWebsite: b.hasWebsite,
      website: b.currentWebsite,
      mapsUrl: b.mapsUrl,
      osm_id: i,
      rating: b.rating,
      reviewCount: b.reviewCount,
      ownerName: b.ownerName,
      currentWebsite: b.currentWebsite,
    }));
    setCsvParsed(parsed);
    setCsvSelected(new Set(parsed.map((_, i) => i)));
  };

  const waUrl = (phone: string) => {
    const clean = phone.replace(/^0/, "62").replace(/\D/g, "");
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospecting Tool</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cari bisnis tanpa website di kota pilihan, lalu import langsung ke pipeline.
        </p>
      </div>

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            Cari Otomatis
          </TabsTrigger>
          <TabsTrigger value="csv" className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2">
            <FileText className="h-4 w-4" />
            Panduan Google Maps
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: SEARCH ── */}
        <TabsContent value="search" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Filter Pencarian</CardTitle>
              <CardDescription>
                Data dari OpenStreetMap — mencakup ribuan bisnis di kota-kota besar Indonesia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label>Kota</Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Kategori Bisnis</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="nowebsite"
                      checked={onlyNoWebsite}
                      onCheckedChange={(v) => setOnlyNoWebsite(Boolean(v))}
                    />
                    <Label htmlFor="nowebsite" className="cursor-pointer text-sm">
                      Hanya yang belum punya website
                    </Label>
                  </div>
                  <Button onClick={handleSearch} disabled={loading} className="w-full gap-2">
                    {loading ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" /> Mencari...</>
                    ) : (
                      <><Search className="h-4 w-4" /> Cari Sekarang</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Pencarian gagal</p>
                <p className="text-destructive/80">{error}</p>
                <p className="mt-1 text-muted-foreground">Coba gunakan tab Import CSV atau coba kota/kategori lain.</p>
              </div>
            </div>
          )}

          {results !== null && (
            <div className="space-y-3">
              {searchMeta?.source === "photon" && results.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    Data dari sumber cadangan (Photon/OpenStreetMap). Info website dan
                    telepon mungkin belum lengkap — buka link Maps untuk verifikasi sebelum
                    menghubungi.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium">
                    Ditemukan <span className="text-primary font-bold">{results.length}</span> bisnis
                    {searchMeta && ` — ${searchMeta.category} di ${searchMeta.city}`}
                  </p>
                  {searchMeta?.source && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {searchMeta.source === "outscraper"
                        ? "Google Maps"
                        : searchMeta.source === "photon"
                          ? "Photon (cadangan)"
                          : searchMeta.source === "cache"
                            ? "Cache"
                            : "OpenStreetMap"}
                    </Badge>
                  )}
                  {results.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={toggleAll} className="h-7 text-xs gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {selected.size === results.length ? "Batal pilih semua" : "Pilih semua"}
                    </Button>
                  )}
                </div>
                {selected.size > 0 && (
                  <Button size="sm" onClick={() => handleImport(results, selected)} disabled={importing} className="gap-2">
                    {importing
                      ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Mengimport...</>
                      : <><Download className="h-3.5 w-3.5" />Import {selected.size} ke Pipeline</>}
                  </Button>
                )}
              </div>

              {results.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <WifiOff className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Tidak ada hasil ditemukan</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coba kota atau kategori lain, atau nonaktifkan filter website.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {results.map((r, i) => (
                    <div
                      key={r.placeId ?? `${r.osm_id}-${i}`}
                      onClick={() => toggleSelect(i)}
                      className={`flex items-center gap-4 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selected.has(i)
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={selected.has(i)}
                        onCheckedChange={() => toggleSelect(i)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{r.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {r.category}
                          </Badge>
                          {r.hasWebsite ? (
                            <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                              <Globe className="h-3 w-3" /> Ada website
                            </Badge>
                          ) : (
                            <Badge className="text-xs shrink-0 gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
                              <WifiOff className="h-3 w-3" /> Belum ada website
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {r.rating && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <Star className="h-3 w-3 fill-current" />
                              {r.rating}
                              {r.reviewCount ? <span className="font-normal text-muted-foreground">({r.reviewCount})</span> : null}
                            </span>
                          )}
                          {r.phone && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{r.phone}</span>}
                          {r.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.address}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {r.phone && (
                          <a href={waUrl(r.phone)} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50">
                              WA
                            </Button>
                          </a>
                        )}
                        {r.mapsUrl && (
                          <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: CSV IMPORT ── */}
        <TabsContent value="csv" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Import dari CSV</CardTitle>
              <CardDescription>
                Paste CSV dari ekstensi G Maps Leads Finder / Maps Business Finder atau Google Sheets — kolom
                terdeteksi otomatis dari baris header. Tanpa header, urutan kolom: Nama Bisnis, No HP, Alamat, Kategori, Link Maps.
                Baris yang punya website tetap diimpor (segmen redesign).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Data CSV</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      setCsvText(
                        `Nama Bisnis,No HP,Alamat,Kategori,Website,Link Maps\nWarung Pak Joko,081234567890,Jl. Merdeka No. 5 Jakarta,Kuliner,,https://maps.google.com/?q=-6.2,106.8\nKlinik Sejahtera,6281234567890,Jl. Sudirman No. 12 Bandung,Kesehatan,https://kliniksejahtera.id,https://maps.google.com/?q=-6.9,107.6`
                      );
                    }}
                  >
                    Isi contoh
                  </Button>
                </div>
                <Textarea
                  placeholder={"Paste langsung hasil export ekstensi G Maps di sini…\n\nAtau format manual:\nNama Bisnis,No HP,Alamat,Kategori,Link Maps\nWarung Pak Joko,081234567890,Jl. Merdeka,Kuliner,"}
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => parseCSV(csvText)}
                disabled={!csvText.trim()}
                className="gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                Parse CSV
              </Button>
            </CardContent>
          </Card>

          {csvParsed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {csvParsed.length} baris ditemukan
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCsvSelected(
                        csvSelected.size === csvParsed.length
                          ? new Set()
                          : new Set(csvParsed.map((_, i) => i))
                      )
                    }
                  >
                    {csvSelected.size === csvParsed.length ? "Batal semua" : "Pilih semua"}
                  </Button>
                  <Button
                    size="sm"
                    disabled={csvSelected.size === 0 || importing}
                    onClick={() => handleImport(csvParsed, csvSelected)}
                    className="gap-2"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Import {csvSelected.size} ke Pipeline
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                {csvParsed.map((r, i) => (
                  <div
                    key={i}
                    onClick={() =>
                      setCsvSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className={`flex items-center gap-4 rounded-lg border p-3 cursor-pointer transition-colors ${
                      csvSelected.has(i)
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <Checkbox checked={csvSelected.has(i)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.name}</span>
                        <Badge variant="outline" className="text-xs">{r.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[
                          r.phone,
                          r.rating ? `⭐ ${r.rating}` : null,
                          r.address,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCsvParsed((prev) => prev.filter((_, j) => j !== i));
                        setCsvSelected((prev) => {
                          const next = new Set(prev);
                          next.delete(i);
                          return next;
                        });
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: GUIDE ── */}
        <TabsContent value="guide" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                  Buka Google Maps
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Buka <a href="https://maps.google.com" target="_blank" className="text-primary underline">maps.google.com</a> dan ketik keyword seperti:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><code className="bg-muted px-1 rounded">warung makan jakarta selatan</code></li>
                  <li><code className="bg-muted px-1 rounded">salon kecantikan bandung</code></li>
                  <li><code className="bg-muted px-1 rounded">bengkel motor yogyakarta</code></li>
                </ul>
                <p>Pilih tampilan daftar (list view) untuk melihat lebih banyak hasil.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                  Filter Tanpa Website
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Klik profil setiap bisnis dan perhatikan:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Tidak ada link website di profil = target prospek</li>
                  <li>Ada tombol "Website" = sudah punya, skip</li>
                  <li>Catat nama bisnis, nomor HP, dan link Google Maps-nya</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                  Catat ke CSV / Spreadsheet
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Cara tercepat: pakai ekstensi G Maps Leads Finder / Maps Business Finder di Chrome, jalankan di hasil pencarian Maps, lalu export CSV.</p>
                <p>Filter di spreadsheet: cari baris <strong>kolom Website kosong</strong> — itu target utama Anda. Tapi baris ber-website jangan dibuang: bagus untuk penawaran redesign.</p>
                <p>Atau buat Google Sheets manual dengan kolom:</p>
                <div className="bg-muted rounded p-2 font-mono text-xs">
                  Nama Bisnis | No HP | Alamat | Kategori | Website | Link Maps
                </div>
                <p>Minimal nama dan nomor HP. Duplikat dideteksi otomatis saat import.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
                  Import ke CRM
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Dari Google Sheets: <strong>File → Download → CSV</strong></p>
                <p>Atau copy-paste langsung ke tab <strong>Import CSV</strong> di sebelah kiri.</p>
                <p>Semua bisnis otomatis masuk ke pipeline tahap <strong>Belum Dihubungi</strong>.</p>
                <Button size="sm" className="mt-2 gap-2" onClick={() => {
                  document.querySelector('[data-value="csv"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }}>
                  <Upload className="h-3.5 w-3.5" />
                  Buka Import CSV
                </Button>
              </CardContent>
            </Card>
          </div>

          <Separator className="my-4" />

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-2">Tips Pencarian Efektif</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
              <li>Fokus pada bisnis lokal yang sudah beroperasi (rating ada, review ada)</li>
              <li>Prioritaskan bisnis dengan foto produk tapi tanpa website</li>
              <li>Kategori paling potensial: Kuliner, Salon, Bengkel, Klinik, Catering</li>
              <li>Target 20-30 prospek per hari untuk hasil optimal</li>
              <li>Gunakan tab Cari Otomatis untuk data dari OpenStreetMap secara instan</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
