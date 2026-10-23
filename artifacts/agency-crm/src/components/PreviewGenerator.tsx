import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Wand2, Copy, CheckCheck, Eye, Sparkles, Layers3, Palette, ArrowRight, Clock3, MessageSquare, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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


type CardStyle = "modern-minimal" | "elegant-classic" | "clean" | "image-focus" | "rounded" | "glass";
interface LandingCopy {
  tagline: string; heroTitle: string; heroDescription: string; aboutText: string; services: string[];
  heroButtonLabel: string; secondaryButtonLabel: string; whatsappLabel: string; footerText: string;
  gallery: Array<{ title: string; caption: string }>;
}
interface EditorState {
  tagline: string; services: string[]; aboutText: string; colorScheme: string;
  logoUrl: string; heroImageUrl: string; galleryImageUrls: string[];
  editorConfig: {
    heroTitle: string; heroDescription: string; heroButtonLabel: string; secondaryButtonLabel: string;
    whatsappLabel: string; footerText: string; accentColor: string; backgroundColor: string; textColor: string;
    sectionVisibility: Record<string, boolean>; sectionStyles: Record<string, CardStyle>;
    galleryItems: Array<{ title: string; caption: string; imageUrl: string }>;
  };
}
interface EditorPreviewData extends EditorState {
  id: number; token: string; businessName: string; ownerName: string | null; category: string; phone: string;
  address: string | null; pageCategory: string; templateStyle: string; updatedAt: string;
}
const CARD_STYLES: Array<{ value: CardStyle; label: string; className: string; description: string }> = [
  { value: "modern-minimal", label: "Modern Minimal", className: "bg-white", description: "Border halus dan shadow lembut" },
  { value: "elegant-classic", label: "Elegant Classic", className: "bg-[#f4eee5]", description: "Aksen champagne dan editorial" },
  { value: "clean", label: "Clean Card", className: "bg-slate-50", description: "Ringan dan terstruktur" },
  { value: "image-focus", label: "Image Focus", className: "bg-gradient-to-br from-slate-300 to-slate-100", description: "Gambar menjadi fokus" },
  { value: "rounded", label: "Rounded Card", className: "rounded-2xl bg-indigo-50", description: "Sudut ramah dan modern" },
  { value: "glass", label: "Glassmorphism", className: "bg-gradient-to-br from-sky-100 to-violet-100", description: "Kaca ringan dengan blur" },
];

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
  const supportsLogoUpload = templateStyle.startsWith("company-") || templateStyle === "corporate-finance" || templateStyle === "technology-saas" || templateStyle === "creative-agency" || templateStyle === "wellness-health" || templateStyle === "conversion-landing";
  const supportsBusinessAssets = templateStyle !== "classic";
  const showAssetControls = supportsBusinessAssets || supportsLogoUpload;
  const [generating, setGenerating] = useState(false);
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<PreviewRecord | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [savedEditor, setSavedEditor] = useState<EditorState | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [draftServices, setDraftServices] = useState("");
  const [uploadingEditor, setUploadingEditor] = useState<AssetType | null>(null);
  const [editorError, setEditorError] = useState("");
  const dirty = Boolean(editor && savedEditor && JSON.stringify(editor) !== JSON.stringify(savedEditor));
  const editorCurrent = useMemo(() => editor, [editor]);

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

  const defaultEditorConfig = (): EditorState["editorConfig"] => ({
    heroTitle: "", heroDescription: "", heroButtonLabel: "", secondaryButtonLabel: "", whatsappLabel: "", footerText: "",
    accentColor: "", backgroundColor: "", textColor: "",
    sectionVisibility: { hero: true, trust: true, categories: true, collection: true, products: true, services: true, gallery: true, about: true, cta: true, footer: true },
    sectionStyles: { services: "modern-minimal", gallery: "image-focus", products: "rounded", testimonials: "elegant-classic" },
    galleryItems: [],
  });

  useEffect(() => { setTagline(""); setServices(""); setAboutText(""); setAssets({ logo: "", hero: "", gallery: [] }); setPageCategory(CATEGORY_OPTIONS.includes(category) ? category : "Company Profile"); setTemplateStyle(defaultTemplateFor(category)); }, [prospectId, category]);

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
          editorConfig: defaultEditorConfig(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviews((prev) => [data, ...prev]);
      await openEditor(data as PreviewRecord);
      toast({ title: "Preview website berhasil dibuat", description: "Edit copy, gambar dan layout sebelum membagikan ke klien." });
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


  const editorUpload = async (file: File, assetType: AssetType) => {
    if (!editor || !activePreview) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) { toast({ title: "Format atau ukuran file tidak didukung", description: "Gunakan JPG, PNG, WebP, atau AVIF maksimal 10 MB.", variant: "destructive" }); return; }
    setUploadingEditor(assetType);
    try {
      const signedRes = await apiFetch("/api/previews/upload-signature", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospectId, assetType }) });
      const signed = await signedRes.json();
      if (!signedRes.ok) throw new Error(signed.error ?? "Gagal menyiapkan upload.");
      const form = new FormData(); form.append("file", file); form.append("api_key", signed.apiKey); form.append("timestamp", String(signed.timestamp)); form.append("folder", signed.folder); form.append("public_id", signed.publicId); form.append("overwrite", "false"); form.append("allowed_formats", signed.allowedFormats.join(",")); form.append("signature", signed.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, { method: "POST", body: form });
      const upload = await response.json();
      if (!response.ok || typeof upload.secure_url !== "string") throw new Error(upload.error?.message ?? "Upload gambar gagal.");
      const url = upload.secure_url as string;
      setEditor((current) => !current ? current : assetType === "logo" ? { ...current, logoUrl: url } : assetType === "hero" ? { ...current, heroImageUrl: url } : { ...current, galleryImageUrls: [...current.galleryImageUrls, url].slice(0, 3), editorConfig: { ...current.editorConfig, galleryItems: [...current.editorConfig.galleryItems, { title: "", caption: "", imageUrl: url }].slice(0, 4) } });
      toast({ title: "Gambar siap dipakai", description: "Simpan perubahan untuk memperbarui link preview." });
    } catch (error) { toast({ title: "Upload gambar gagal", description: error instanceof Error ? error.message : "Terjadi kesalahan.", variant: "destructive" }); }
    finally { setUploadingEditor(null); }
  };

  const openEditor = async (record: PreviewRecord) => {
    setEditorLoading(true); setEditorError("");
    try {
      const response = await apiFetch(`/api/previews/${record.id}/editor`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memuat editor.");
      const normalized: EditorState = {
        tagline: data.tagline ?? "", services: data.services ?? [], aboutText: data.aboutText ?? "", colorScheme: data.colorScheme ?? "ivory",
        logoUrl: data.logoUrl ?? "", heroImageUrl: data.heroImageUrl ?? "", galleryImageUrls: data.galleryImageUrls ?? [],
        editorConfig: { ...defaultEditorConfig(), ...(data.editorConfig ?? {}),
          sectionVisibility: { ...defaultEditorConfig().sectionVisibility, ...(data.editorConfig?.sectionVisibility ?? {}) },
          sectionStyles: { ...defaultEditorConfig().sectionStyles, ...(data.editorConfig?.sectionStyles ?? {}) },
          galleryItems: (data.editorConfig?.galleryItems ?? []).map((item: { title?: string; caption?: string; imageUrl?: string }) => ({ title: item.title ?? "", caption: item.caption ?? "", imageUrl: item.imageUrl ?? "" })),
        },
      };
      setActivePreview(record); setEditor(normalized); setSavedEditor(normalized);
    } catch (error) { setEditorError(error instanceof Error ? error.message : "Editor gagal dimuat."); }
    finally { setEditorLoading(false); }
  };

  const generateCopy = async () => {
    setAiGenerating(true); setEditorError("");
    try {
      const response = await apiFetch("/api/previews/generate-copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospectId, pageCategory, templateStyle, notes: aiNotes || undefined, services: draftServices || undefined }) });
      const data = await response.json() as LandingCopy & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "AI gagal menghasilkan copy.");
      setTagline(data.tagline); setServices(data.services.join(", ")); setAboutText(data.aboutText); setDraftServices(data.services.join(", "));
      if (editor) setEditor({ ...editor, tagline: data.tagline, services: data.services, aboutText: data.aboutText, editorConfig: { ...editor.editorConfig, heroTitle: data.heroTitle, heroDescription: data.heroDescription, heroButtonLabel: data.heroButtonLabel, secondaryButtonLabel: data.secondaryButtonLabel, whatsappLabel: data.whatsappLabel, footerText: data.footerText, galleryItems: data.gallery.map((item, index) => ({ ...item, imageUrl: editor.galleryImageUrls[index] ?? "" })) } });
      toast({ title: "Draft copy AI berhasil dibuat", description: "Silakan tinjau semua konten sebelum disimpan atau dibagikan." });
    } catch (error) { setEditorError(error instanceof Error ? error.message : "AI gagal menghasilkan copy."); }
    finally { setAiGenerating(false); }
  };

  const payloadForEditor = () => {
    if (!editor) throw new Error("Pilih preview yang akan diedit.");
    return { ...editor, editorConfig: { ...editor.editorConfig, galleryItems: editor.editorConfig.galleryItems.map((item) => ({ ...item, imageUrl: item.imageUrl || undefined })) } };
  };

  const refreshLivePreview = async () => {
    if (!activePreview || !editor) return;
    try {
      const response = await apiFetch(`/api/previews/${activePreview.id}/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadForEditor()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal merender preview.");
      setPreviewHtml(data.html);
    } catch (error) { setEditorError(error instanceof Error ? error.message : "Preview gagal dirender."); }
  };

  useEffect(() => { if (activePreview && editor) void refreshLivePreview(); }, [activePreview?.id, editor]);

  const saveEditor = async () => {
    if (!activePreview || !editor) return;
    setEditorSaving(true); setEditorError("");
    try {
      const response = await apiFetch(`/api/previews/${activePreview.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadForEditor()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan perubahan.");
      setSavedEditor(editor);
      setActivePreview((current) => current ? { ...current, token: data.token } : current);
      toast({ title: "Perubahan tersimpan", description: "URL preview tetap sama dan sudah menampilkan versi tersimpan." });
    } catch (error) { setEditorError(error instanceof Error ? error.message : "Gagal menyimpan perubahan."); }
    finally { setEditorSaving(false); }
  };

  const resetEditor = () => {
    if (!savedEditor) return;
    setEditor(savedEditor); setEditorError("");
  };

  const editorShare = async () => {
    if (!activePreview) return;
    const url = `${window.location.origin}/preview/${activePreview.token}`;
    try { await navigator.clipboard.writeText(url); toast({ title: "URL preview disalin" }); }
    catch { toast({ title: "Tidak dapat menyalin URL", description: "Periksa izin clipboard browser.", variant: "destructive" }); }
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

          {showAssetControls && <section className="space-y-3" aria-labelledby="generator-assets-title">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">3</span><div><h3 id="generator-assets-title" className="text-sm font-semibold">{supportsBusinessAssets ? "Personalisasi aset visual" : "Logo bisnis"}</h3><p className="text-[11px] text-muted-foreground">{supportsBusinessAssets ? "Unggah logo, foto utama, dan maksimal 3 foto galeri. JPG, PNG, WebP, AVIF · maks. 10 MB." : "Unggah logo untuk ditampilkan pada header preview. JPG, PNG, WebP, AVIF · maks. 10 MB."}</p></div></div>
            <div className={`grid gap-3 ${supportsBusinessAssets ? "sm:grid-cols-3" : "max-w-sm sm:grid-cols-3"}`}>{(supportsBusinessAssets ? ([ ["logo", "Logo bisnis", assets.logo], ["hero", "Foto hero", assets.hero], ["gallery", `Foto galeri (${assets.gallery.length}/3)`, ""] ] as const) : ([ ["logo", "Logo bisnis", assets.logo] ] as const)).map(([type, label, current]) => <div key={type} className="space-y-2 rounded-lg border border-border/70 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{label}</span>{current && <button type="button" className="text-muted-foreground hover:text-destructive" aria-label={`Hapus ${label}`} onClick={() => setAssets((previous) => ({ ...previous, [type]: "" }))}><X className="h-3.5 w-3.5" /></button>}</div>{current ? <img src={current} alt={`Pratinjau ${label}`} className="h-24 w-full rounded-md bg-muted object-contain" /> : <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/25 text-center text-[10px] text-muted-foreground hover:bg-muted/50"><ImagePlus className="h-4 w-4" />Pilih gambar<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading !== null || (type === "gallery" && assets.gallery.length >= 3)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAsset(file, type); event.currentTarget.value = ""; }} /></label>}{type === "gallery" && assets.gallery.map((url, index) => <div key={url} className="flex items-center gap-2"><img src={url} alt={`Foto galeri ${index + 1}`} className="h-10 w-10 rounded object-cover" /><button type="button" aria-label={`Hapus foto galeri ${index + 1}`} onClick={() => setAssets((previous) => ({ ...previous, gallery: previous.gallery.filter((_, itemIndex) => itemIndex !== index) }))}><X className="h-3.5 w-3.5" /></button></div>)}{uploading === type && <p className="text-[10px] text-muted-foreground">Mengunggah…</p>}</div>)}</div>
            <p className="text-[10px] leading-4 text-muted-foreground">Upload memakai signature server; API secret tidak dikirim ke browser. Perlu konfigurasi CLOUDINARY_* pada server.</p>
          </section>}

          <section className="space-y-3" aria-labelledby="generator-palette-title">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{showAssetControls ? "4" : "3"}</span><div><h3 id="generator-palette-title" className="text-sm font-semibold">Warna tema</h3><p className="text-[11px] text-muted-foreground">Pilih satu warna utama yang sudah didukung preview.</p></div></div>
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

      {editor && activePreview && <section className="overflow-hidden rounded-2xl border border-[#e9e4dc] bg-[#faf9f6] shadow-sm" aria-label="Editor landing page">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9e4dc] bg-white px-4 py-3 sm:px-5"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7b4f]">Studio editor · {activePreview.pageCategory ?? pageCategory}</p><h2 className="mt-1 truncate text-base font-semibold">Edit preview {businessName}</h2><p className="mt-1 text-[11px] text-muted-foreground">{dirty ? "Ada perubahan yang belum disimpan" : `Tersimpan ${new Date((savedEditor as EditorState & { updatedAt?: string })?.updatedAt ?? activePreview.createdAt).toLocaleString("id-ID")}`}</p></div><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={resetEditor} disabled={!dirty}>Reset</Button><Button size="sm" variant="outline" onClick={() => void editorShare()}><ExternalLink className="mr-1.5 h-3.5 w-3.5"/>Bagikan</Button><Button size="sm" onClick={() => void saveEditor()} disabled={!dirty || editorSaving}>{editorSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <CheckCheck className="mr-1.5 h-3.5 w-3.5"/>}Simpan Perubahan</Button></div></div>
        <div className="grid min-w-0 gap-4 p-3 lg:grid-cols-[minmax(250px,.72fr)_minmax(0,1.6fr)_minmax(230px,.72fr)] lg:p-4">
          <Card className="h-fit min-w-0 border-[#ebe6df] shadow-none"><CardHeader className="pb-3"><CardTitle className="text-sm">Konten website</CardTitle><CardDescription>Edit teks sebelum dikirim kepada klien.</CardDescription></CardHeader><CardContent>
            <Tabs defaultValue="content"><TabsList className="grid h-auto w-full grid-cols-4 bg-[#f5f2ed] p-1"><TabsTrigger value="content" className="px-1.5 text-[10px]">Konten</TabsTrigger><TabsTrigger value="images" className="px-1.5 text-[10px]">Gambar</TabsTrigger><TabsTrigger value="styles" className="px-1.5 text-[10px]">Style</TabsTrigger><TabsTrigger value="sections" className="px-1.5 text-[10px]">Bagian</TabsTrigger></TabsList>
              <TabsContent value="content" className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#eadfc9] bg-[#fbf7ee] p-3"><Label htmlFor="ai-copy-notes" className="text-xs font-semibold">Buat draft dengan AI</Label><Textarea id="ai-copy-notes" value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} className="mt-2 min-h-16 bg-white text-xs" placeholder="Keunikan/kata kunci yang diketahui pemilik bisnis (opsional)"/><Button type="button" onClick={() => void generateCopy()} disabled={aiGenerating} className="mt-2 h-9 w-full gap-2 bg-[#9a7b4f] hover:bg-[#806440]">{aiGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Generate copy AI</Button><p className="mt-2 text-[10px] leading-4 text-muted-foreground">AI membuat draft dari data prospek dan input Anda. Periksa klaim/fakta sebelum publish.</p></div>
                <div className="space-y-1.5"><Label className="text-xs">Judul Hero / Tagline</Label><Textarea value={editor.editorConfig.heroTitle || editor.tagline} onChange={(e) => setEditor({ ...editor, tagline: e.target.value, editorConfig: { ...editor.editorConfig, heroTitle: e.target.value } })} rows={2}/></div>
                <div className="space-y-1.5"><Label className="text-xs">Deskripsi Hero</Label><Textarea value={editor.editorConfig.heroDescription || editor.aboutText} onChange={(e) => setEditor({ ...editor, aboutText: e.target.value, editorConfig: { ...editor.editorConfig, heroDescription: e.target.value } })} rows={3}/></div>
                <div className="space-y-1.5"><Label className="text-xs">Tentang Bisnis</Label><Textarea value={editor.aboutText} onChange={(e) => setEditor({ ...editor, aboutText: e.target.value })} rows={4}/></div>
                <div className="space-y-1.5"><Label className="text-xs">Layanan / produk (pisahkan baris baru)</Label><Textarea value={editor.services.join("\n")} onChange={(e) => setEditor({ ...editor, services: e.target.value.split("\n").slice(0, 8) })} rows={4}/></div>
                {[ ["heroButtonLabel", "Teks CTA utama"], ["secondaryButtonLabel", "Teks tombol sekunder"], ["whatsappLabel", "Floating WhatsApp"], ["footerText", "Teks footer"] ].map(([field,label]) => <div className="space-y-1.5" key={field}><Label className="text-xs">{label}</Label><Input value={editor.editorConfig[field as keyof EditorState["editorConfig"]] as string} onChange={(e) => setEditor({ ...editor, editorConfig: { ...editor.editorConfig, [field]: e.target.value } })}/></div>)}
              </TabsContent>
              <TabsContent value="images" className="mt-4 space-y-3">
                {([["logo", "Logo bisnis", editor.logoUrl], ["hero", "Gambar Hero", editor.heroImageUrl]] as const).map(([kind,label,url]) => <div className="rounded-lg border p-3" key={kind}><div className="mb-2 flex items-center justify-between"><Label className="text-xs">{label}</Label>{url && <Button size="sm" variant="ghost" onClick={() => setEditor({ ...editor, [kind === "logo" ? "logoUrl" : "heroImageUrl"]: "" })}>Hapus</Button>}</div>{url && <img className="mb-2 h-24 w-full rounded-md object-cover" src={url} alt={label}/>}<label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground"><ImagePlus className="h-4 w-4"/>Ganti gambar<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => { const file=e.target.files?.[0]; if(file) void editorUpload(file,kind); e.currentTarget.value=""; }}/></label></div>)}
                {editor.galleryImageUrls.map((url,index) => <div className="flex items-center gap-2 rounded-md border p-2" key={`${url}-${index}`}><img src={url} className="h-12 w-12 rounded object-cover" alt={`Galeri ${index+1}`}/><span className="min-w-0 flex-1 truncate text-xs">Foto galeri {index+1}</span><Button size="sm" variant="ghost" onClick={() => setEditor({ ...editor, galleryImageUrls: editor.galleryImageUrls.filter((_,i)=>i!==index), editorConfig: { ...editor.editorConfig, galleryItems: editor.editorConfig.galleryItems.filter((_,i)=>i!==index) } })}>Hapus</Button></div>)}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground"><ImagePlus className="h-4 w-4"/>Tambah gambar galeri (maks. 3)<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={editor.galleryImageUrls.length>=3} onChange={(e)=>{const file=e.target.files?.[0]; if(file) void editorUpload(file,"gallery");e.currentTarget.value="";}}/></label>
              </TabsContent>
              <TabsContent value="styles" className="mt-4 space-y-4"><div className="space-y-2"><Label className="text-xs">Warna aksen</Label><Input type="color" value={editor.editorConfig.accentColor || "#9a7b4f"} onChange={(e)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, accentColor: e.target.value } })}/><Label className="text-xs">Warna latar</Label><Input type="color" value={editor.editorConfig.backgroundColor || "#faf7f0"} onChange={(e)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, backgroundColor: e.target.value } })}/><Label className="text-xs">Warna teks</Label><Input type="color" value={editor.editorConfig.textColor || "#30271f"} onChange={(e)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, textColor: e.target.value } })}/><Button variant="outline" size="sm" onClick={()=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, accentColor:"", backgroundColor:"", textColor:"" } })}>Reset warna template</Button></div><div className="space-y-2"><Label className="text-xs font-semibold">Pilih Style Card · Layanan</Label><div className="grid grid-cols-2 gap-2">{CARD_STYLES.map((style)=> <button type="button" key={style.value} aria-pressed={editor.editorConfig.sectionStyles.services===style.value} onClick={()=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, sectionStyles: { ...editor.editorConfig.sectionStyles, services: style.value } } })} className={`rounded-lg border p-2 text-left ${editor.editorConfig.sectionStyles.services===style.value ? "border-[#9a7b4f] ring-1 ring-[#9a7b4f]" : "border-border"}`}><span className={`mb-2 block h-12 border ${style.className}`}/><span className="block text-[11px] font-semibold">{style.label}</span><span className="block text-[9px] text-muted-foreground">{style.description}</span></button>)}</div><Label className="mt-3 block text-xs font-semibold">Style Card · Galeri</Label><div className="grid grid-cols-2 gap-2">{CARD_STYLES.map((style)=> <button type="button" key={style.value} aria-pressed={editor.editorConfig.sectionStyles.gallery===style.value} onClick={()=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, sectionStyles: { ...editor.editorConfig.sectionStyles, gallery: style.value } } })} className={`rounded-lg border p-2 text-left ${editor.editorConfig.sectionStyles.gallery===style.value ? "border-[#9a7b4f] ring-1 ring-[#9a7b4f]" : "border-border"}`}><span className={`mb-2 block h-12 border ${style.className}`}/><span className="block text-[11px] font-semibold">${style.label}</span></button>)}</div><Label className="mt-3 block text-xs font-semibold">Style Card · Produk</Label><Select value={editor.editorConfig.sectionStyles.products} onValueChange={(value)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, sectionStyles: { ...editor.editorConfig.sectionStyles, products: value as CardStyle } } })}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{CARD_STYLES.map((style)=><SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>)}</SelectContent></Select></div></TabsContent>
              <TabsContent value="sections" className="mt-4 space-y-3">{Object.entries(editor.editorConfig.sectionVisibility).map(([key,enabled])=><div key={key} className="flex items-center justify-between rounded-md border p-2.5"><Label className="text-xs capitalize">{key}</Label><Switch checked={enabled} onCheckedChange={(checked)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, sectionVisibility: { ...editor.editorConfig.sectionVisibility, [key]: checked } } })}/></div>)}</TabsContent>
            </Tabs>
          </CardContent></Card>
          <Card className="min-w-0 overflow-hidden border-[#ebe6df] shadow-none"><CardHeader className="flex-row items-center justify-between space-y-0 pb-3"><CardTitle className="text-sm">Live preview {dirty && <span className="ml-2 text-[10px] font-normal text-amber-700">· Belum disimpan</span>}</CardTitle><div className="flex gap-1"><Button size="sm" variant={viewport==="desktop"?"default":"outline"} onClick={()=>setViewport("desktop")}>Desktop</Button><Button size="sm" variant={viewport==="mobile"?"default":"outline"} onClick={()=>setViewport("mobile")}>Mobile</Button></div></CardHeader><CardContent className="p-2 pt-0"><div className="flex min-h-[460px] justify-center overflow-auto rounded-lg border bg-[#ece9e3] p-2"><iframe title={`Live preview ${businessName}`} srcDoc={previewHtml} sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox" className={`min-h-[700px] border-0 bg-white shadow-md ${viewport==="mobile"?"w-[390px] max-w-full rounded-[28px] border-[8px] border-slate-800":"w-full"}`}/></div></CardContent></Card>
          <Card className="h-fit min-w-0 border-[#ebe6df] shadow-none"><CardHeader className="pb-3"><CardTitle className="text-sm">Pengaturan halaman</CardTitle><CardDescription>Perubahan terlihat langsung di preview.</CardDescription></CardHeader><CardContent className="space-y-3"><div><Label className="text-xs">Kategori</Label><p className="mt-1 text-sm font-medium">{activePreview.pageCategory ?? pageCategory}</p></div><div><Label className="text-xs">Style template</Label><p className="mt-1 text-sm">{TEMPLATE_OPTIONS.find(x=>x.value===activePreview.templateStyle)?.label ?? activePreview.templateStyle}</p></div><div className="rounded-lg border p-3"><Label className="text-xs">URL preview tetap</Label><code className="mt-2 block break-all text-[10px]">{window.location.origin}/preview/{activePreview.token}</code></div><Button variant="outline" className="w-full" onClick={()=>void refreshLivePreview()}><Eye className="mr-2 h-4 w-4"/>Perbarui Live Preview</Button></CardContent></Card>
        </div>
      </section>}
      {editorLoading && <div className="rounded-lg border p-4 text-xs text-muted-foreground" role="status"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Memuat editor preview…</div>}
      {editorError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive" role="alert">{editorError}</div>}

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
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-lg" onClick={() => void openEditor(preview)}><Wand2 className="h-3.5 w-3.5"/>Edit</Button><Button size="sm" className="h-9 gap-1.5 rounded-lg" onClick={() => openPreview(preview.token)}><ExternalLink className="h-3.5 w-3.5" />Buka Preview</Button>
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
