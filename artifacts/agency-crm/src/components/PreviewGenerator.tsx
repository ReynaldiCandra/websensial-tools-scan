import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Wand2, Copy, CheckCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { toWaNumber } from "@/lib/phone";

interface Props {
  prospectId: number;
  businessName: string;
  category: string;
  phone: string;
}

interface PreviewRecord {
  id: number;
  token: string;
  previewUrl: string;
  colorScheme: string;
  templateStyle?: string;
  viewCount: number;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  "Company Profile",
  "Fashion",
  "Fashion & Luxury",
  "Corporate, Hukum, & Keuangan",
  "Teknologi & SaaS",
  "Portofolio Kreatif & Agensi",
  "Wellness, Skincare, & Kesehatan",
  "Landing Page High Konversi (Iklan Meta & Google Ads)",
  "Kuliner",
  "Salon & Kecantikan",
  "Otomotif",
  "Kesehatan",
  "Apotek",
  "Fotografi",
  "Laundry",
  "Catering",
  "Hotel & Penginapan",
  "Pendidikan",
  "Toko Elektronik",
  "Toko Material",
  "Percetakan",
  "Furniture",
  "Jasa Umum",
  "Gym & Kebugaran",
  "Pet Shop & Hewan",
  "Servis Elektronik",
];

const TEMPLATE_OPTIONS = [
  { value: "fashion-catalog", label: "Fashion Catalog", description: "Kartu produk, diskon, harga, dan WhatsApp" },
  { value: "company-modern", label: "Company Profile Modern", description: "Company profile premium serbaguna" },
  { value: "company-elegant", label: "Company Profile Elegant", description: "Tipografi editorial dan layout berkelas" },
  { value: "company-minimal", label: "Company Profile Minimal", description: "Layout bersih, fokus pada layanan" },
  { value: "corporate-finance", label: "Corporate, Hukum & Keuangan", description: "Tampilan tepercaya dan formal" },
  { value: "technology-saas", label: "Teknologi & SaaS", description: "Tampilan produk digital modern" },
  { value: "creative-agency", label: "Portofolio Kreatif & Agensi", description: "Tata letak ekspresif untuk karya dan layanan" },
  { value: "wellness-health", label: "Wellness, Skincare & Kesehatan", description: "Nuansa lembut, natural, dan menenangkan" },
  { value: "conversion-landing", label: "Landing Page High Konversi (Iklan Meta & Google Ads)", description: "Landing page fokus konversi untuk trafik iklan" },
  { value: "classic", label: "Landing Page Classic", description: "Landing page sederhana serbaguna" },
];

const PALETTE_GROUPS: Record<string, string[]> = {
  "Company Profile": ["ivory", "beige", "taupe", "brown", "black"],
  "Fashion": ["ivory", "beige", "taupe", "brown", "black"],
  "Fashion & Luxury": ["ivory", "beige", "taupe", "brown", "black"],
  "Corporate, Hukum, & Keuangan": ["white", "ivory", "navy", "charcoal", "black"],
  "Teknologi & SaaS": ["charcoal", "dark-slate", "navy", "soft-blue", "ivory"],
  "Portofolio Kreatif & Agensi": ["black", "charcoal", "ivory", "neon-accent"],
  "Wellness, Skincare, & Kesehatan": ["ivory", "taupe", "sage-green", "soft-rose", "brown"],
  "Landing Page High Konversi": ["navy", "soft-blue", "white", "charcoal", "neon-accent"],
  "Landing Page High Konversi (Iklan Meta & Google Ads)": ["navy", "soft-blue", "white", "charcoal", "neon-accent"],
};

const COLOR_OPTIONS = [
  { value: "ivory", label: "Ivory", color: "#f7f3e9" },
  { value: "beige", label: "Beige", color: "#e8dcc8" },
  { value: "taupe", label: "Taupe", color: "#9a8878" },
  { value: "brown", label: "Brown", color: "#795548" },
  { value: "black", label: "Black", color: "#171717" },
  { value: "white", label: "White", color: "#ffffff" },
  { value: "navy", label: "Navy", color: "#183153" },
  { value: "charcoal", label: "Charcoal", color: "#343a40" },
  { value: "dark-slate", label: "Dark Slate", color: "#334155" },
  { value: "soft-blue", label: "Soft Blue", color: "#9bbfe0" },
  { value: "neon-accent", label: "Neon Accent", color: "#c6f36b" },
  { value: "sage-green", label: "Sage Green", color: "#91a58b" },
  { value: "soft-rose", label: "Soft Rose", color: "#d9aab0" },
  { value: "indigo", label: "Indigo", color: "#4f46e5" },
  { value: "emerald", label: "Emerald", color: "#059669" },
  { value: "amber", label: "Amber", color: "#d97706" },
  { value: "rose", label: "Rose", color: "#e11d48" },
  { value: "violet", label: "Violet", color: "#7c3aed" },
  { value: "slate", label: "Slate", color: "#475569" },
];

function colorsForCategory(pageCategory: string) {
  const recommended = PALETTE_GROUPS[pageCategory] ?? [];
  const values = [...recommended, ...COLOR_OPTIONS.map((option) => option.value).filter((value) => !recommended.includes(value))];
  return values.map((value) => COLOR_OPTIONS.find((option) => option.value === value)!).filter(Boolean);
}

const defaultTemplateFor = (pageCategory: string) => {
  if (pageCategory === "Fashion" || pageCategory === "Fashion & Luxury") return "fashion-catalog";
  if (pageCategory === "Corporate, Hukum, & Keuangan") return "corporate-finance";
  if (pageCategory === "Teknologi & SaaS") return "technology-saas";
  if (pageCategory === "Portofolio Kreatif & Agensi") return "creative-agency";
  if (pageCategory === "Wellness, Skincare, & Kesehatan") return "wellness-health";
  if (pageCategory.startsWith("Landing Page High Konversi")) return "conversion-landing";
  return "company-modern";
};

export function PreviewGenerator({ prospectId, businessName, category, phone }: Props) {
  const { toast } = useToast();
  const [tagline, setTagline] = useState("");
  const [services, setServices] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [pageCategory, setPageCategory] = useState(
    CATEGORY_OPTIONS.includes(category) ? category : "Company Profile",
  );
  const [colorScheme, setColorScheme] = useState(() =>
    colorsForCategory(CATEGORY_OPTIONS.includes(category) ? category : "Company Profile")[0]?.value ?? "indigo",
  );
  const [templateStyle, setTemplateStyle] = useState(() => defaultTemplateFor(category));
  const [generating, setGenerating] = useState(false);
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/previews/prospect/${prospectId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat preview sebelumnya");
        const data = (await res.json()) as PreviewRecord[];
        if (!cancelled) setPreviews(data);
      })
      .catch(() => {
        if (!cancelled) setPreviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [prospectId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch(`/api/previews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId,
          tagline: tagline || undefined,
          colorScheme,
          services: services || undefined,
          aboutText: aboutText || undefined,
          pageCategory,
          templateStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviews((prev) => [data, ...prev]);
      toast({ title: "Preview website berhasil dibuat!" });
    } catch (e: unknown) {
      toast({ title: "Gagal generate preview", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/preview/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Link preview disalin!" });
  };

  const openPreview = (token: string) => {
    window.open(`/preview/${token}`, "_blank");
  };

  const waShare = (token: string) => {
    const waNumber = toWaNumber(phone);
    if (!waNumber) {
      toast({
        title: "Nomor HP tidak valid",
        description: `Nomor "${phone || "-"}" belum bisa dipakai untuk WhatsApp.`,
        variant: "destructive",
      });
      return;
    }

    const url = `${window.location.origin}/preview/${token}`;
    const msg = encodeURIComponent(
      `Halo! Saya sudah siapkan preview website gratis untuk ${businessName}.\n\nSilakan lihat di sini: ${url}\n\nBagaimana menurut Anda? Apakah ingin kita wujudkan websitenya?`
    );
    window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Generate Preview Website
          </CardTitle>
          <CardDescription className="text-xs">
            Buat preview website otomatis untuk {businessName} — share link-nya ke owner via WA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori website</Label>
              <Select
                value={pageCategory}
                onValueChange={(value) => {
                  setPageCategory(value);
                  setTemplateStyle(defaultTemplateFor(value));
                  setColorScheme(colorsForCategory(value)[0]?.value ?? "indigo");
                }}
              >
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Style UI/UX</Label>
              <Select value={templateStyle} onValueChange={setTemplateStyle}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex flex-col text-left">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {templateStyle === "fashion-catalog"
              ? "Katalog memakai kartu produk contoh (bukan katalog atau harga asli)."
              : templateStyle === "conversion-landing"
                ? "Layout ringkas dengan CTA utama untuk trafik iklan Meta dan Google."
                : "Palet warna mengikuti karakter kategori bisnis yang dipilih."}
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Tagline (opsional)</Label>
            <Input
              placeholder={`Layanan terbaik untuk setiap kebutuhan ${category.toLowerCase()} Anda`}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Layanan (pisah dengan koma, opsional)</Label>
            <Input
              placeholder="Layanan 1, Layanan 2, Layanan 3"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tentang bisnis (opsional)</Label>
            <Textarea
              placeholder="Deskripsi singkat tentang bisnis..."
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Warna tema</Label>
            {(() => {
              const colors = colorsForCategory(pageCategory);
              const recommendedCount = PALETTE_GROUPS[pageCategory]?.length ?? 0;
              const renderColors = (options: typeof COLOR_OPTIONS) => (
                <div className="flex gap-2 flex-wrap">
                  {options.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColorScheme(c.value)}
                      type="button"
                      aria-pressed={colorScheme === c.value}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                        colorScheme === c.value
                          ? "border-foreground shadow-sm font-semibold"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <span className={`h-4 w-4 rounded-full border ${c.value === "white" || c.value === "ivory" ? "border-black/20" : "border-transparent"}`} style={{ background: c.color }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              );
              return (
                <div className="space-y-2">
                  {recommendedCount > 0 && (
                    <>
                      <p className="text-[11px] text-muted-foreground">Rekomendasi {pageCategory}</p>
                      {renderColors(colors.slice(0, recommendedCount))}
                      <p className="pt-1 text-[11px] text-muted-foreground">Warna lainnya</p>
                    </>
                  )}
                  {renderColors(colors.slice(recommendedCount))}
                </div>
              );
            })()}
          </div>
          <Button onClick={generate} disabled={generating} className="w-full gap-2" size="sm">
            {generating
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating...</>
              : <><Wand2 className="h-3.5 w-3.5" />Generate Preview Website</>}
          </Button>
        </CardContent>
      </Card>

      {previews.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Preview yang sudah dibuat ({previews.length})
          </p>
          {previews.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: COLOR_OPTIONS.find((c) => c.value === p.colorScheme)?.color ?? "#4f46e5",
                    }}
                  />
                  <Badge variant="secondary" className="text-[10px]">
                    {TEMPLATE_OPTIONS.find((option) => option.value === p.templateStyle)?.label ?? p.templateStyle ?? "Classic"}
                  </Badge>
                  <code className="text-xs text-muted-foreground font-mono">/preview/{p.token.slice(0, 8)}…</code>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Eye className="h-2.5 w-2.5" />{p.viewCount} views
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={() => openPreview(p.token)}
                >
                  <ExternalLink className="h-3 w-3" />
                  Buka Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={() => copyLink(p.token)}
                >
                  {copied === p.token
                    ? <><CheckCheck className="h-3 w-3 text-green-600" />Disalin!</>
                    : <><Copy className="h-3 w-3" />Copy Link</>}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => waShare(p.token)}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.12 1.532 5.848L.047 23.869c-.09.383.247.72.63.63l6.021-1.485A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.007-1.371l-.358-.213-3.716.917.935-3.618-.234-.372A9.817 9.817 0 012.182 12C2.182 6.565 6.565 2.182 12 2.182S21.818 6.565 21.818 12 17.435 21.818 12 21.818z"/>
                  </svg>
                  Kirim WA
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
