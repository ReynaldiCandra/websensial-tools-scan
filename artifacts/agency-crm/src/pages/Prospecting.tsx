import { useState, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Search, MapPin, Globe, CheckCircle2, Star,
  RefreshCw, AlertTriangle, ExternalLink, MessageCircle, ChevronDown, X, Upload, FileText, WifiOff, Download, Gauge
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { parseBusinessCsv } from "@/lib/csv";
import { useListTemplates } from "@workspace/api-client-react";

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

/** Last search is kept in localStorage so changing menu does not lose it. */
const LAST_SEARCH_KEY = "websensial:prospecting:last-search:v1";

interface QuotaInfo {
  configured: boolean;
  quota: number;
  used: number | null;
  remaining: number | null;
}

interface StoredSearch {
  city: string;
  category: string;
  onlyNoWebsite: boolean;
  results: SearchResult[];
  searchMeta: { city: string; category: string; total: number; source?: string };
  page?: number;
  hasMore?: boolean;
  savedAt: string;
}

/**
 * 0–100 lead score. No website is the strongest buying signal, a phone number
 * makes the lead actionable, and rating + review count show real traction.
 */
function priorityScore(row: SearchResult): number {
  let score = 0;
  if (!row.hasWebsite) score += 45;
  if (row.phone) score += 20;

  const rating = row.rating ? Number(row.rating) : null;
  if (rating !== null && Number.isFinite(rating)) {
    if (rating >= 4.5) score += 20;
    else if (rating >= 4) score += 15;
    else if (rating >= 3.5) score += 8;
  }

  const reviews = row.reviewCount ? Number(row.reviewCount) : 0;
  if (reviews >= 100) score += 15;
  else if (reviews >= 30) score += 10;
  else if (reviews >= 10) score += 5;

  return Math.min(100, score);
}

function priorityLabel(score: number): string {
  if (score >= 80) return "Prioritas tinggi";
  if (score >= 55) return "Sedang";
  return "Rendah";
}

function priorityClass(score: number): string {
  if (score >= 80) return "border-orange-500/30 bg-orange-500/10 text-orange-600";
  if (score >= 55) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "text-muted-foreground";
}

/** Stable identity so selection survives re-sorting of the result list. */
function rowKey(row: SearchResult): string {
  return `${row.placeId ?? ""}::${row.osm_id}::${row.name}`;
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSearchAt, setLastSearchAt] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [waLogged, setWaLogged] = useState<Set<string>>(new Set());

  // Template WA dipakai untuk mengisi pesan sebelum chat dibuka.
  const { data: waTemplates } = useListTemplates();

  // Credit monitor for the Google Maps provider (Serper).
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  // Selection state (keyed by rowKey so sorting keeps the ticks correct)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [sortBy, setSortBy] = useState<"priority" | "rating" | "name">("priority");

  const displayed = useMemo(() => {
    if (!results) return [] as SearchResult[];
    const rows = [...results];

    if (sortBy === "rating") {
      rows.sort((a, b) => Number(b.rating ?? -1) - Number(a.rating ?? -1));
    } else if (sortBy === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name, "id"));
    } else {
      rows.sort(
        (a, b) =>
          priorityScore(b) - priorityScore(a) ||
          Number(b.reviewCount ?? 0) - Number(a.reviewCount ?? 0),
      );
    }

    return rows;
  }, [results, sortBy]);

  // CSV import state
  const [csvText, setCsvText] = useState("");
  const [csvParsed, setCsvParsed] = useState<SearchResult[]>([]);
  const [csvSelected, setCsvSelected] = useState<Set<number>>(new Set());

  const loadQuota = useCallback(async () => {
    try {
      const res = await apiFetch("/api/prospecting/quota");
      if (!res.ok) return;
      const json = (await res.json()) as Record<string, unknown>;
      setQuota({
        configured: Boolean(json.configured),
        quota: Number(json.quota ?? 0),
        used: json.used === null || json.used === undefined ? null : Number(json.used),
        remaining:
          json.remaining === null || json.remaining === undefined
            ? null
            : Number(json.remaining),
      });
    } catch {
      // Monitoring must never block searching.
    }
  }, []);

  // Restore the previous result set (and refresh the quota) when the page is
  // opened again, so navigating to another menu no longer loses the search.
  useEffect(() => {
    void loadQuota();

    try {
      const raw = localStorage.getItem(LAST_SEARCH_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as StoredSearch;
      if (!Array.isArray(saved.results) || !saved.searchMeta) return;

      setCity(saved.city);
      setCategory(saved.category);
      setOnlyNoWebsite(saved.onlyNoWebsite);
      setResults(saved.results);
      setSearchMeta(saved.searchMeta);
      setLastSearchAt(saved.savedAt ?? null);
      setPage(saved.page ?? 1);
      setHasMore(Boolean(saved.hasMore));
    } catch {
      // Storage blocked or corrupted: start with a clean page.
    }
  }, [loadQuota]);

  const fetchPage = useCallback(
    async (nextPage: number, options: { append?: boolean; refresh?: boolean } = {}) => {
      const append = options.append ?? false;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setResults(null);
        setSelected(new Set());
      }
      setError(null);
      setNotice(null);

      try {
        const params = new URLSearchParams({
          city,
          category,
          onlyNoWebsite: String(onlyNoWebsite),
          page: String(nextPage),
        });
        if (options.refresh) params.set("refresh", "1");

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

        const incoming = json.results as SearchResult[];
        const nextMeta = {
          city: String(json.city ?? city),
          category: String(json.category ?? category),
          total: Number(json.total ?? 0),
          source: typeof json.source === "string" ? json.source : undefined,
        };
        const nextHasMore = Boolean(json.hasMore);
        const savedAt = new Date().toISOString();

        setResults((prev) => {
          const merged = append && prev ? [...prev] : [];
          const seen = new Set(merged.map(rowKey));
          for (const row of incoming) {
            const key = rowKey(row);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(row);
          }

          try {
            localStorage.setItem(
              LAST_SEARCH_KEY,
              JSON.stringify({
                city,
                category,
                onlyNoWebsite,
                results: merged,
                searchMeta: nextMeta,
                page: nextPage,
                hasMore: nextHasMore,
                savedAt,
              } satisfies StoredSearch),
            );
          } catch {
            // Storage full or disabled: the in-memory result stays on screen.
          }

          return merged;
        });

        setPage(nextPage);
        setHasMore(nextHasMore);
        setSearchMeta(nextMeta);
        setLastSearchAt(savedAt);

        if (typeof json.notice === "string") setNotice(json.notice);
      } catch (e: unknown) {
        const message =
          e instanceof TypeError
            ? "Tidak bisa menghubungi server. Pastikan API berjalan (jalankan `npm run dev`)."
            : (e as Error).message;
        setError(message || "Pencarian gagal. Coba lagi.");
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
        void loadQuota();
      }
    },
    [city, category, onlyNoWebsite, loadQuota],
  );

  const handleSearch = useCallback(
    (force = false) => {
      void fetchPage(1, { refresh: force });
    },
    [fetchPage],
  );

  const handleLoadMore = useCallback(() => {
    void fetchPage(page + 1, { append: true });
  }, [fetchPage, page]);

  const waNumber = (phone: string) => phone.replace(/^0/, "62").replace(/\D/g, "");

  const buildWaMessage = (row: SearchResult) => {
    const template = waTemplates?.find((t) => t.type === "initial") ?? waTemplates?.[0];
    if (!template) return null;

    return {
      name: template.name,
      text: template.content
        .replace(/\{\{businessName\}\}/g, row.name)
        .replace(/\{\{ownerName\}\}/g, row.ownerName || "Bapak/Ibu")
        .replace(/\{\{category\}\}/g, row.category),
    };
  };

  /** Simpan lead (kalau belum ada) lalu catat WA sebagai aktivitas. */
  const logWaToPipeline = async (row: SearchResult, templateName: string | null) => {
    const res = await apiFetch("/api/prospecting/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prospects: [
          {
            businessName: row.name,
            phone: row.phone || "",
            address: row.address ?? undefined,
            category: row.category,
            hasWebsite: row.hasWebsite,
            mapsUrl: row.mapsUrl ?? undefined,
            rating: row.rating ?? undefined,
            reviewCount: row.reviewCount ?? undefined,
          },
        ],
      }),
    });

    const json = await readApiResponse(res);
    if (!res.ok) {
      throw new Error(
        typeof json.error === "string" ? json.error : `Gagal mencatat lead (HTTP ${res.status})`,
      );
    }

    const ids = [
      ...(Array.isArray(json.ids) ? json.ids : []),
      ...(Array.isArray(json.matchedIds) ? json.matchedIds : []),
    ];
    const prospectId = Number(ids[0] ?? 0);
    if (!prospectId) return null;

    await apiFetch(`/api/prospects/${prospectId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dihubungi" }),
    });

    await apiFetch(`/api/prospects/${prospectId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "wa_sent",
        notes: templateName ? `WA dikirim — template: ${templateName}` : "WA dikirim dari Prospecting",
      }),
    });

    return prospectId;
  };

  const handleWa = async (row: SearchResult) => {
    const rendered = buildWaMessage(row);
    const url = `https://wa.me/${waNumber(row.phone)}${
      rendered ? `?text=${encodeURIComponent(rendered.text)}` : ""
    }`;
    window.open(url, "_blank");

    const key = rowKey(row);
    if (waLogged.has(key)) return;
    setWaLogged((prev) => new Set(prev).add(key));

    try {
      const prospectId = await logWaToPipeline(row, rendered?.name ?? null);
      if (prospectId) {
        toast({
          title: "Tercatat di pipeline",
          description: `${row.name} → status Dihubungi.`,
        });
      }
    } catch (e: unknown) {
      toast({
        title: "WA dibuka, pencatatan gagal",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const exportCsv = () => {
    const header = [
      "Nama",
      "Kategori",
      "Rating",
      "Jumlah Review",
      "No HP",
      "Alamat",
      "Website",
      "Status Website",
      "Skor Prioritas",
      "Link Maps",
    ];
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = displayed.map((row) => [
      row.name,
      row.category,
      row.rating ?? "",
      row.reviewCount ?? "",
      row.phone,
      row.address ?? "",
      row.website ?? "",
      row.hasWebsite ? "Ada website" : "Belum ada website",
      priorityScore(row),
      row.mapsUrl ?? "",
    ]);

    const csv =
      "\uFEFF" +
      [header, ...rows].map((line) => line.map(escape).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `prospek-${city}-${category}.csv`.replace(/\s+/g, "-").toLowerCase();
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (!displayed.length) return;
    if (selected.size === displayed.length) setSelected(new Set());
    else setSelected(new Set(displayed.map(rowKey)));
  };

  const handleImport = async (toImport: SearchResult[]) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prospecting Tool</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cari bisnis tanpa website di kota pilihan, lalu import langsung ke pipeline.
        </p>
      </div>

      <Card className={quota?.configured ? "border-primary/30 bg-primary/5" : undefined}>
        <CardContent className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Gauge className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium">Kuota pencarian</span>
            {quota?.configured ? (
              <span className="text-muted-foreground">
                {quota.remaining === null ? (
                  "pemakaian belum bisa dibaca dari database"
                ) : (
                  <>
                    sisa{" "}
                    <strong className="text-foreground">
                      {quota.remaining.toLocaleString("id-ID")}
                    </strong>{" "}
                    dari {quota.quota.toLocaleString("id-ID")} pencarian
                  </>
                )}
                {quota.used !== null && (
                  <span className="ml-2 text-xs">
                    · {quota.used.toLocaleString("id-ID")} terpakai oleh dashboard ini
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">
                OpenStreetMap aktif (tanpa batas). Tambahkan <code>SERPER_API_KEY</code> untuk
                data Google Maps.
              </span>
            )}
          </div>
          <a
            href="https://serper.dev/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline"
          >
            Kredit resmi di Serper <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      {quota?.configured &&
        quota.remaining !== null &&
        quota.quota > 0 &&
        quota.remaining <= Math.ceil(quota.quota * 0.1) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Sisa kuota tinggal <strong>{quota.remaining.toLocaleString("id-ID")}</strong> pencarian.
              Setelah habis, pencarian otomatis memakai OpenStreetMap (tanpa rating dan nomor HP).
            </p>
          </div>
        )}

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
                Data dari Google Maps (nama, rating, nomor HP, status website) — atau OpenStreetMap bila API key belum aktif.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="city">Kota</Label>
                  <Input
                    id="city"
                    list="prospecting-cities"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="cth: Cikarang"
                    autoComplete="off"
                  />
                  <datalist id="prospecting-cities">
                    {CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-muted-foreground">
                    Ketik kota/kecamatan mana pun — daftar hanya saran.
                  </p>
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
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSearch()}
                      disabled={loading || city.trim().length < 2}
                      className="flex-1 gap-2"
                    >
                      {loading ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Mencari...</>
                      ) : (
                        <><Search className="h-4 w-4" /> Cari Sekarang</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSearch(true)}
                      disabled={loading || city.trim().length < 2}
                      title="Abaikan cache 24 jam (memakai 1 kredit)"
                      className="gap-2"
                    >
                      <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tombol panah = paksa ambil data baru (1 kredit).
                  </p>
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

          {notice && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{notice}</p>
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
                  {results.length > 1 && (
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                      <SelectTrigger className="h-7 w-[168px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Skor prioritas</SelectItem>
                        <SelectItem value="rating">Rating tertinggi</SelectItem>
                        <SelectItem value="name">Nama A–Z</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {searchMeta?.source && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {searchMeta.source === "serper" || searchMeta.source === "outscraper"
                        ? "Google Maps"
                        : searchMeta.source === "photon"
                          ? "Photon (cadangan)"
                          : searchMeta.source === "cache"
                            ? "Cache"
                            : "OpenStreetMap"}
                    </Badge>
                  )}
                  {lastSearchAt && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      disimpan {formatSavedAt(lastSearchAt)}
                    </span>
                  )}
                  {displayed.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportCsv} className="h-7 text-xs gap-1">
                      <Download className="h-3.5 w-3.5" /> CSV
                    </Button>
                  )}
                  {displayed.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={toggleAll} className="h-7 text-xs gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {selected.size === displayed.length ? "Batal pilih semua" : "Pilih semua"}
                    </Button>
                  )}
                </div>
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    onClick={() => handleImport(displayed.filter((r) => selected.has(rowKey(r))))}
                    disabled={importing}
                    className="gap-2"
                  >
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
                  {displayed.map((r) => {
                    const key = rowKey(r);
                    const score = priorityScore(r);

                    return (
                    <div
                      key={key}
                      onClick={() => toggleSelect(key)}
                      className={`flex items-center gap-4 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selected.has(key)
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={selected.has(key)}
                        onCheckedChange={() => toggleSelect(key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{r.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {r.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 gap-1 ${priorityClass(score)}`}
                            title={`Skor prioritas ${score}/100`}
                          >
                            {score} · {priorityLabel(score)}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleWa(r)}
                            title="Kirim WA ber-template & catat ke pipeline"
                            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            WA
                          </Button>
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
                    );
                  })}
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center pt-1">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" /> Memuat...</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> Muat 20 bisnis lagi</>
                    )}
                  </Button>
                </div>
              )}

              {!hasMore && results.length > 0 && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Semua hasil untuk pencarian ini sudah dimuat.
                </p>
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
                    onClick={() =>
                      handleImport(csvParsed.filter((_, i) => csvSelected.has(i)))
                    }
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
