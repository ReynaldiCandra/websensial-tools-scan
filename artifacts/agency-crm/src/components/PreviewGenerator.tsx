import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Wand2, Copy, CheckCheck, Eye, Sparkles, Layers3, Palette, ArrowRight, Clock3, MessageSquare, ImagePlus, X } from "lucide-react";
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

type AssetType = "logo" | "hero" | "gallery";
type UploadedAssets = { logo: string; hero: string; gallery: string[] };

interface PreviewRecord {
  id: number;
  token: string;
  previewUrl: string;
  colorScheme: string;
  templateStyle?: string;
  pageCategory?: string;
  viewCount: number;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  "Company Profile",
  "Konstruksi & Renovasi",
  "Hotel / Property",
  "Tour & Travel",
  "Online Course",
  "Restoran",
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
  { value: "fashion-catalog", label: "Fashion Editorial", description: "Landing page editorial dengan kategori dan katalog demo" },
  { value: "hotel-property", label: "Hotel & Property", description: "Landing page hospitality, properti, fasilitas, dan galeri inspirasi" },
  { value: "tour-travel", label: "Tour & Travel", description: "Landing page destinasi dan inspirasi perjalanan" },
  { value: "online-course", label: "Online Course", description: "Landing page program belajar, silabus, dan pendaftaran" },
  { value: "restaurant", label: "Restoran", description: "Landing page suasana, menu inspirasi, dan reservasi" },
  { value: "company-modern", label: "Company Profile Modern", description: "Landing page perusahaan; pilih Konstruksi & Renovasi untuk template konstruksi" },
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
  "Konstruksi & Renovasi": ["navy", "charcoal", "slate", "ivory", "beige"],
  "Hotel / Property": ["navy", "ivory", "beige", "taupe", "charcoal"],
  "Tour & Travel": ["soft-blue", "navy", "sage-green", "ivory", "charcoal"],
  "Online Course": ["indigo", "navy", "soft-blue", "charcoal", "white"],
  "Restoran": ["brown", "ivory", "sage-green", "charcoal", "beige"],
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
  if (pageCategory === "Konstruksi & Renovasi") return "company-modern";
  if (pageCategory === "Hotel / Property") return "hotel-property";
  if (pageCategory === "Tour & Travel") return "tour-travel";
  if (pageCategory === "Online Course") return "online-course";
  if (pageCategory === "Restoran") return "restaurant";
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
  const [assets, setAssets] = useState<UploadedAssets>({ logo: "", hero: "", gallery: [] });
  const [uploading, setUploading] = useState<AssetType | null>(null);
  const [pageCategory, setPageCategory] = useState(
    CATEGORY_OPTIONS.includes(category) ? category : "Company Profile",
  );
  const [colorScheme, setColorScheme] = useState(() => {
    const firstRecommended = colorsForCategory(CATEGORY_OPTIONS.includes(category) ? category : "Company Profile")[0]?.value ?? "indigo";
    return COLOR_OPTIONS.some((option) => option.value === firstRecommended) ? firstRecommended : "ivory";
  });
  const [templateStyle, setTemplateStyle] = useState(() => defaultTemplateFor(category));
  const supportsBusinessAssets = templateStyle === "fashion-catalog" || templateStyle === "hotel-property" || templateStyle === "tour-travel" || templateStyle === "online-course" || templateStyle === "restaurant" || (pageCategory === "Konstruksi & Renovasi" && templateStyle === "company-modern");
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
          logoUrl: assets.logo || undefined,
          heroImageUrl: assets.hero || undefined,
          galleryImageUrls: assets.gallery,
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

  const uploadAsset = async (file: File, assetType: AssetType) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) { toast({ title: "Format atau ukuran file tidak didukung", description: "Gunakan JPG, PNG, WebP, atau AVIF maksimal 10 MB.", variant: "destructive" }); return; }
    setUploading(assetType);
    try {
      const signResponse = await apiFetch("/api/previews/upload-signature", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospectId, assetType }) });
      const signed = await signResponse.json();
      if (!signResponse.ok) throw new Error(signed.error ?? "Gagal menyiapkan upload.");
      const form = new FormData(); form.append("file", file); form.append("api_key", signed.apiKey); form.append("timestamp", String(signed.timestamp)); form.append("folder", signed.folder); form.append("public_id", signed.publicId); form.append("overwrite", "false"); form.append("allowed_formats", signed.allowedFormats.join(",")); form.append("signature", signed.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, { method: "POST", body: form });
      const uploaded = await response.json();
      if (!response.ok || typeof uploaded.secure_url !== "string") throw new Error(uploaded.error?.message ?? "Upload gambar gagal.");
      setAssets((previous) => assetType === "gallery" ? { ...previous, gallery: [...previous.gallery, uploaded.secure_url].slice(0, 3) } : { ...previous, [assetType]: uploaded.secure_url });
      toast({ title: "Aset berhasil diunggah", description: "Aset akan disimpan bersama preview berikutnya." });
    } catch (error) { toast({ title: "Upload aset gagal", description: error instanceof Error ? error.message : "Terjadi kesalahan saat upload.", variant: "destructive" }); }
    finally { setUploading(null); }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/preview/${token}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      window.setTimeout(() => setCopied(null), 2000);
      toast({ title: "Link preview disalin!" });
    }).catch(() => {
      toast({ title: "Tidak dapat menyalin link", description: "Periksa izin clipboard browser Anda.", variant: "destructive" });
    });
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
    <div className="min-w-0 space-y-5">
      <Card className="ws-card min-w-0 overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/[0.055] to-transparent p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="ws-eyebrow">Website studio</p>
              <CardTitle className="mt-1 text-lg font-semibold tracking-tight">Generate Preview Website</CardTitle>
              <CardDescription className="mt-1 text-xs leading-5">Siapkan konsep satu halaman untuk <strong className="font-medium text-foreground">{businessName}</strong>, lalu bagikan ke calon klien melalui WhatsApp.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-5">
          <section className="space-y-3" aria-labelledby="generator-category-title">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">1</span><div><h3 id="generator-category-title" className="text-sm font-semibold">Informasi dasar</h3><p className="text-[11px] text-muted-foreground">Pilih jenis website dan karakter desain.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label className="text-xs">Kategori website</Label>
                <Select value={pageCategory} onValueChange={(value) => {
                  setPageCategory(value);
                  setTemplateStyle(defaultTemplateFor(value));
                  const recommended = colorsForCategory(value)[0]?.value ?? "indigo";
                  setColorScheme(COLOR_OPTIONS.some((option) => option.value === recommended) ? recommended : "ivory");
                }}>
                  <SelectTrigger className="h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORY_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label className="text-xs">Style UI/UX</Label>
                <Select value={templateStyle} onValueChange={setTemplateStyle}>
                  <SelectTrigger className="h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{TEMPLATE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}><span className="flex min-w-0 flex-col text-left"><span className="truncate">{option.label}</span><span className="text-xs text-muted-foreground">{option.description}</span></span></SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-[11px] leading-5 text-muted-foreground"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><p>{templateStyle === "fashion-catalog" ? "Landing page editorial fashion; foto dan item katalog adalah contoh demo dan dapat diganti pemilik bisnis." : ["hotel-property", "tour-travel", "online-course", "restaurant"].includes(templateStyle) ? "Landing page khusus industri. Foto showcase dan semua paket, fasilitas, menu, program, jadwal, serta klaim adalah contoh demo—perbarui dengan data dan aset bisnis aktual." : pageCategory === "Konstruksi & Renovasi" && templateStyle === "company-modern" ? "Konsep company profile konstruksi dengan foto arsitektur demo; ganti dengan foto proyek dan informasi aktual sebelum dipresentasikan sebagai hasil klien." : templateStyle === "conversion-landing" ? "Layout ringkas dengan CTA utama untuk trafik iklan Meta dan Google." : "Palet warna disarankan berdasarkan kategori bisnis yang dipilih."}</p></div>
          </section>

          <section className="space-y-3" aria-labelledby="generator-content-title">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">2</span><div><h3 id="generator-content-title" className="text-sm font-semibold">Konten bisnis</h3><p className="text-[11px] text-muted-foreground">Lengkapi informasi opsional untuk memperkaya preview.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="preview-tagline" className="text-xs">Tagline <span className="font-normal text-muted-foreground">(opsional)</span></Label><Input id="preview-tagline" placeholder={`Layanan terbaik untuk ${category.toLowerCase()} Anda`} value={tagline} onChange={(event) => setTagline(event.target.value)} className="h-10 rounded-lg text-sm" /></div>
              <div className="space-y-1.5"><Label htmlFor="preview-services" className="text-xs">Layanan / produk <span className="font-normal text-muted-foreground">(pisahkan dengan koma)</span></Label><Input id="preview-services" placeholder="Konsultasi, produk unggulan…" value={services} onChange={(event) => setServices(event.target.value)} className="h-10 rounded-lg text-sm" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="preview-about" className="text-xs">Tentang bisnis <span className="font-normal text-muted-foreground">(opsional)</span></Label><Textarea id="preview-about" placeholder="Ceritakan keunggulan bisnis, target pelanggan, dan hal yang ingin ditampilkan…" value={aboutText} onChange={(event) => setAboutText(event.target.value)} rows={3} className="resize-y rounded-lg text-sm" /></div>
            </div>
          </section>

          {supportsBusinessAssets && <section className="space-y-3" aria-labelledby="generator-assets-title">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">3</span><div><h3 id="generator-assets-title" className="text-sm font-semibold">Personalisasi aset visual</h3><p className="text-[11px] text-muted-foreground">Unggah logo, foto utama, dan maksimal 3 foto galeri. JPG, PNG, WebP, AVIF · maks. 10 MB.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-3">{([ ["logo", "Logo bisnis", assets.logo], ["hero", "Foto hero", assets.hero], ["gallery", `Foto galeri (${assets.gallery.length}/3)`, ""] ] as const).map(([type, label, current]) => <div key={type} className="space-y-2 rounded-lg border border-border/70 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{label}</span>{current && <button type="button" className="text-muted-foreground hover:text-destructive" aria-label={`Hapus ${label}`} onClick={() => setAssets((previous) => ({ ...previous, [type]: "" }))}><X className="h-3.5 w-3.5" /></button>}</div>{current ? <img src={current} alt={`Pratinjau ${label}`} className="h-24 w-full rounded-md bg-muted object-contain" /> : <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/25 text-center text-[10px] text-muted-foreground hover:bg-muted/50"><ImagePlus className="h-4 w-4" />Pilih gambar<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading !== null || (type === "gallery" && assets.gallery.length >= 3)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAsset(file, type); event.currentTarget.value = ""; }} /></label>}{type === "gallery" && assets.gallery.map((url, index) => <div key={url} className="flex items-center gap-2"><img src={url} alt={`Foto galeri ${index + 1}`} className="h-10 w-10 rounded object-cover" /><button type="button" aria-label={`Hapus foto galeri ${index + 1}`} onClick={() => setAssets((previous) => ({ ...previous, gallery: previous.gallery.filter((_, itemIndex) => itemIndex !== index) }))}><X className="h-3.5 w-3.5" /></button></div>)}{uploading === type && <p className="text-[10px] text-muted-foreground">Mengunggah…</p>}</div>)}</div>
            <p className="text-[10px] leading-4 text-muted-foreground">Upload memakai signature server; API secret tidak dikirim ke browser. Perlu konfigurasi CLOUDINARY_* pada server.</p>
          </section>}

          <section className="space-y-3" aria-labelledby="generator-palette-title">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">3</span><div><h3 id="generator-palette-title" className="text-sm font-semibold">Warna tema</h3><p className="text-[11px] text-muted-foreground">Pilih satu warna utama yang sudah didukung preview.</p></div></div>
            {(() => {
              const recommended = PALETTE_GROUPS[pageCategory] ?? [];
              const allColors = colorsForCategory(pageCategory);
              const displayColors = recommended.length ? allColors.slice(0, Math.max(recommended.length, 5)) : allColors;
              return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{displayColors.map((color) => <button key={color.value} type="button" aria-pressed={colorScheme === color.value} onClick={() => setColorScheme(color.value)} className={`flex min-h-10 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${colorScheme === color.value ? "border-primary bg-primary/[0.045] text-foreground ring-1 ring-primary/20" : "border-border bg-white text-muted-foreground hover:border-primary/35 hover:text-foreground"}`}><span className={`h-5 w-5 shrink-0 rounded-full border ${["white", "ivory"].includes(color.value) ? "border-black/15" : "border-black/5"}`} style={{ backgroundColor: color.color }} /><span className="min-w-0 flex-1 truncate">{color.label}</span>{colorScheme === color.value && <CheckCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}</button>)}</div>;
            })()}
          </section>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-[11px] leading-5 text-muted-foreground">Hasil berupa preview website satu halaman. Tinjau konten sebelum membagikan link ke calon klien.</p>
            <Button onClick={() => void generate()} disabled={generating} className="h-11 w-full shrink-0 gap-2 rounded-lg px-5 sm:w-auto">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" />Sedang membuat preview…</> : <><Wand2 className="h-4 w-4" />Generate Preview Website<ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previews.length > 0 && (
        <section className="space-y-3" aria-labelledby="preview-history-title">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="ws-eyebrow">Hasil tersimpan</p><h2 id="preview-history-title" className="mt-1 text-base font-semibold">Riwayat preview</h2></div><Badge variant="secondary" className="rounded-full">{previews.length} preview</Badge></div>
          {previews.map((preview) => {
            const color = COLOR_OPTIONS.find((option) => option.value === preview.colorScheme);
            const template = TEMPLATE_OPTIONS.find((option) => option.value === preview.templateStyle)?.label ?? preview.templateStyle ?? "Classic";
            return <Card key={preview.id} className="ws-card min-w-0">
              <CardContent className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-border/70" style={{ background: color?.color ?? "#f3f4f6" }} aria-label={`Warna ${color?.label ?? preview.colorScheme}`} />
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="max-w-full break-words text-sm font-semibold">{preview.pageCategory ?? businessName}</h3><Badge variant="outline" className="max-w-full truncate text-[10px]">{template}</Badge></div><div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Date(preview.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{preview.viewCount} kunjungan</span><span className="inline-flex items-center gap-1"><Palette className="h-3 w-3" />{color?.label ?? preview.colorScheme}</span></div><code className="mt-1 block max-w-full truncate font-mono text-[10px] text-muted-foreground">{window.location.origin}/preview/{preview.token}</code></div>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:w-auto lg:shrink-0">
                  <Button size="sm" className="h-9 gap-1.5 rounded-lg" onClick={() => openPreview(preview.token)}><ExternalLink className="h-3.5 w-3.5" />Buka Preview</Button>
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-lg" onClick={() => copyLink(preview.token)}>{copied === preview.token ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{copied === preview.token ? "Tersalin" : "Salin Link"}</Button>
                  <Button size="sm" variant="outline" className="col-span-2 h-9 gap-1.5 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:col-span-1" onClick={() => waShare(preview.token)}><MessageSquare className="h-3.5 w-3.5" />Kirim WhatsApp</Button>
                </div>
              </CardContent>
            </Card>;
          })}
        </section>
      )}
      {loaded && previews.length === 0 && <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground"><Layers3 className="h-4 w-4 shrink-0" />Belum ada preview untuk bisnis ini. Hasil pertama akan muncul di sini.</div>}
    </div>
  );
}
