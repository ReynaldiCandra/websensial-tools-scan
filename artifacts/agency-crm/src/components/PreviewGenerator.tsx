import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Wand2, Copy, CheckCheck, Eye, Sparkles, Layers3, Palette, ArrowRight, Clock3, MessageSquare, ImagePlus, X, Trash2 } from "lucide-react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  prospectId: number;
  businessName: string;
  category: string;
  phone: string;
}

type AssetType = "logo" | "hero" | "gallery";
type UploadedAssets = { logo: string; hero: string; gallery: string[] };

function cloudinaryUploadMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Cloudinary gagal mengunggah gambar. Silakan coba kembali.";
  const error = "error" in payload ? payload.error : undefined;
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
  if (/invalid signature/i.test(message)) return "Tanda tangan upload Cloudinary tidak cocok. Coba lagi; jika berulang, periksa konfigurasi CLOUDINARY di server.";
  if (!message) return "Cloudinary gagal mengunggah gambar. Silakan coba kembali.";
  return message.length > 180 ? `${message.slice(0, 177)}…` : message;
}

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
    whatsappLabel: string; footerText: string; accentColor: string; secondaryColor: string; backgroundColor: string; textColor: string;
    sectionVisibility: Record<string, boolean>; sectionStyles: Record<string, CardStyle>;
    galleryItems: Array<{ title: string; caption: string; imageUrl: string }>;
  };
}
interface EditorPreviewData extends EditorState {
  id: number; token: string; businessName: string; ownerName: string | null; category: string; phone: string;
  address: string | null; pageCategory: string; templateStyle: string; updatedAt: string;
}
const CARD_STYLES: Array<{ value: CardStyle; label: string; description: string }> = [
  { value: "modern-minimal", label: "Modern Minimal", description: "Putih, border tipis, dan shadow lembut · profesional" },
  { value: "elegant-classic", label: "Elegant Classic", description: "Tipografi elegan, aksen beige/gold · fashion, properti, hospitality" },
  { value: "clean", label: "Clean Card", description: "Sederhana, ringan, dan terstruktur · katalog dan layanan" },
  { value: "image-focus", label: "Image Focus", description: "Gambar dominan dengan rasio konsisten · portfolio dan galeri" },
  { value: "rounded", label: "Rounded Card", description: "Sudut membulat dan padding nyaman · produk digital" },
  { value: "glass", label: "Glassmorphism", description: "Translucent dengan blur ringan dan teks kontras" },
];

function CardStyleThumbnail({ style }: { style: CardStyle }) {
  const isImageFocus = style === "image-focus";
  return <div aria-hidden="true" className={`relative h-16 overflow-hidden ${style === "elegant-classic" ? "bg-[#f5efe5] p-2" : style === "clean" ? "bg-slate-50 p-2" : style === "glass" ? "bg-gradient-to-br from-sky-200 via-cyan-100 to-violet-200 p-2" : style === "rounded" ? "bg-gradient-to-br from-indigo-100 to-sky-50 p-2" : "bg-white p-2"}`}>
    <div className={`relative h-full overflow-hidden ${style === "modern-minimal" ? "rounded-md border border-slate-200 bg-white p-1.5 shadow-sm" : style === "elegant-classic" ? "rounded-sm border border-[#d5c39e] bg-[#fffdf8] px-2 py-1" : style === "clean" ? "border-b border-slate-200 bg-slate-50 px-1 py-1" : style === "image-focus" ? "rounded-md border border-slate-200 bg-white shadow-md" : style === "rounded" ? "rounded-xl border border-indigo-100 bg-white p-1.5 shadow-sm" : "rounded-lg border border-white/70 bg-white/55 p-1.5 shadow-md backdrop-blur-sm"}`}>
      {isImageFocus ? <><div className="h-8 rounded-t bg-gradient-to-br from-amber-200 via-rose-200 to-sky-300"/><div className="flex items-center justify-between px-1 pt-1"><span className="h-1 w-12 rounded-full bg-slate-500"/><span className="h-2 w-5 rounded-full bg-indigo-500"/></div></> : style === "elegant-classic" ? <><div className="mb-1 h-px w-8 bg-[#b99b62]"/><div className="font-serif text-[8px] text-[#5a4932]">Atelier <span className="text-[#b99b62]">✦</span></div><div className="mt-1 h-px w-full bg-[#e8dfce]"/><div className="mt-1 h-1 w-10 rounded-full bg-[#d8c7a5]"/></> : style === "clean" ? <><div className="text-[7px] font-semibold text-slate-700">Layanan pilihan</div><div className="mt-1 h-px w-full bg-slate-200"/><div className="mt-1 h-1 w-14 rounded-full bg-slate-300"/><div className="mt-1 h-1 w-9 rounded-full bg-slate-200"/></> : style === "glass" ? <><div className="text-[7px] font-semibold text-slate-800">Studio collection</div><div className="mt-1 h-1 w-14 rounded-full bg-slate-500/60"/><div className="mt-1 inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[5px] text-slate-700">Explore ↗</div></> : <><div className="flex items-center gap-1"><span className={`grid h-4 w-4 place-items-center rounded ${style === "rounded" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}><span className="text-[7px]">{style === "rounded" ? "✦" : "01"}</span></span><span className="text-[7px] font-semibold text-slate-700">{style === "rounded" ? "Made for you" : "Trusted service"}</span></div><div className="ml-5 mt-1 h-1 w-14 rounded-full bg-slate-300"/><div className="ml-5 mt-1 h-1 w-9 rounded-full bg-slate-200"/></>}
    </div>
  </div>;
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

const PALETTE_PAIR_GROUPS: Record<string, Array<[string, string]>> = {
  "Company Profile": [["ivory", "taupe"], ["beige", "brown"], ["black", "ivory"]],
  "Konstruksi & Renovasi": [["navy", "beige"], ["charcoal", "ivory"], ["slate", "soft-blue"]],
  "Hotel / Property": [["navy", "beige"], ["ivory", "taupe"], ["charcoal", "soft-blue"]],
  "Tour & Travel": [["soft-blue", "navy"], ["sage-green", "ivory"], ["navy", "amber"]],
  "Online Course": [["indigo", "soft-blue"], ["navy", "amber"], ["charcoal", "neon-accent"]],
  "Restoran": [["brown", "ivory"], ["sage-green", "beige"], ["charcoal", "amber"]],
  "Fashion": [["ivory", "taupe"], ["black", "beige"], ["soft-rose", "brown"]],
  "Fashion & Luxury": [["ivory", "taupe"], ["black", "beige"], ["soft-rose", "brown"]],
  "Corporate, Hukum, & Keuangan": [["white", "navy"], ["ivory", "charcoal"], ["navy", "soft-blue"]],
  "Teknologi & SaaS": [["charcoal", "soft-blue"], ["dark-slate", "neon-accent"], ["navy", "ivory"]],
  "Portofolio Kreatif & Agensi": [["black", "neon-accent"], ["charcoal", "soft-rose"], ["ivory", "violet"]],
  "Wellness, Skincare, & Kesehatan": [["ivory", "sage-green"], ["soft-rose", "taupe"], ["beige", "brown"]],
  "Landing Page High Konversi": [["navy", "soft-blue"], ["white", "indigo"], ["charcoal", "neon-accent"]],
  "Landing Page High Konversi (Iklan Meta & Google Ads)": [["navy", "soft-blue"], ["white", "indigo"], ["charcoal", "neon-accent"]],
};

const colorPairsForCategory = (pageCategory: string) => PALETTE_PAIR_GROUPS[pageCategory] ?? [["navy", "soft-blue"], ["ivory", "sage-green"], ["charcoal", "amber"]] as Array<[string, string]>;

const PREVIEW_PALETTES: Record<string, { primary: string; accent: string; background: string; text: string }> = {
  ivory: { primary: "#8a6e50", accent: "#c0a77d", background: "#faf7f0", text: "#30271f" }, beige: { primary: "#987856", accent: "#c2a887", background: "#f4eee5", text: "#392f25" },
  taupe: { primary: "#7c6657", accent: "#aa9382", background: "#f2eeea", text: "#302721" }, brown: { primary: "#795548", accent: "#a9826b", background: "#f5eee9", text: "#34241d" },
  black: { primary: "#c6a76d", accent: "#e1c68f", background: "#171717", text: "#f8f5ef" }, white: { primary: "#24466b", accent: "#7192b3", background: "#ffffff", text: "#1f2937" },
  navy: { primary: "#284c77", accent: "#6f91b8", background: "#f2f6fb", text: "#162a43" }, charcoal: { primary: "#d0b477", accent: "#e5c879", background: "#262a2f", text: "#f6f4ef" },
  "dark-slate": { primary: "#8ab4d6", accent: "#a6c9e6", background: "#1e293b", text: "#f1f5f9" }, "soft-blue": { primary: "#477ba8", accent: "#7eadd0", background: "#f2f7fb", text: "#203448" },
  "neon-accent": { primary: "#c6f36b", accent: "#d6ff7f", background: "#17191d", text: "#f7f8f4" }, "sage-green": { primary: "#607b65", accent: "#91a58b", background: "#f2f5f0", text: "#26352a" },
  "soft-rose": { primary: "#ad6878", accent: "#d9aab0", background: "#fbf3f4", text: "#38272b" }, indigo: { primary: "#4f46e5", accent: "#818cf8", background: "#eef2ff", text: "#1e1b4b" },
  emerald: { primary: "#059669", accent: "#34d399", background: "#ecfdf5", text: "#064e3b" }, amber: { primary: "#d97706", accent: "#fbbf24", background: "#fffbeb", text: "#78350f" },
  rose: { primary: "#e11d48", accent: "#fb7185", background: "#fff1f2", text: "#881337" }, violet: { primary: "#7c3aed", accent: "#a78bfa", background: "#f5f3ff", text: "#2e1065" }, slate: { primary: "#475569", accent: "#94a3b8", background: "#f8fafc", text: "#0f172a" },
};

function defaultColorFor(pageCategory: string): string {
  return colorPairsForCategory(pageCategory)[0]?.[0] ?? "ivory";
}
function defaultAccentFor(pageCategory: string): string {
  return colorPairsForCategory(pageCategory)[0]?.[1] ?? "sage-green";
}
function colorPairForScheme(pageCategory: string, scheme: string): [string, string] {
  return colorPairsForCategory(pageCategory).find(([primary]) => primary === scheme) ?? colorPairsForCategory(pageCategory)[0] ?? ["ivory", "sage-green"];
}

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
  const [colorScheme, setColorScheme] = useState(() => defaultColorFor(CATEGORY_OPTIONS.includes(category) ? category : "Company Profile"));
  const [accentScheme, setAccentScheme] = useState(() => defaultAccentFor(CATEGORY_OPTIONS.includes(category) ? category : "Company Profile"));
  const [initialCardStyle, setInitialCardStyle] = useState<CardStyle>("modern-minimal");
  const paletteForScheme = (scheme: string) => PREVIEW_PALETTES[scheme] ?? PREVIEW_PALETTES.ivory;
  const previewEditorConfig = (config: EditorState["editorConfig"], scheme = colorScheme, accent = accentScheme, category = pageCategory): EditorState["editorConfig"] => {
    const selectedPalette = PREVIEW_PALETTES[scheme] ?? PREVIEW_PALETTES.ivory;
    const [, pairedColor] = colorPairForScheme(category, scheme);
    return {
      ...config,
      accentColor: config.accentColor || selectedPalette.primary,
      backgroundColor: config.backgroundColor || selectedPalette.background,
      textColor: config.textColor || selectedPalette.text,
      secondaryColor: config.secondaryColor || PREVIEW_PALETTES[accent]?.primary || PREVIEW_PALETTES[pairedColor]?.primary || selectedPalette.accent,
    };
  };
  const [templateStyle, setTemplateStyle] = useState(() => defaultTemplateFor(category));
  const supportsLogoUpload = templateStyle.startsWith("company-") || templateStyle === "corporate-finance" || templateStyle === "technology-saas" || templateStyle === "creative-agency" || templateStyle === "wellness-health" || templateStyle === "conversion-landing";
  const supportsBusinessAssets = templateStyle !== "classic";
  const showAssetControls = supportsBusinessAssets || supportsLogoUpload;
  const [generating, setGenerating] = useState(false);
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);
  const [deletingPreviewId, setDeletingPreviewId] = useState<number | null>(null);
  const [pendingDeletePreview, setPendingDeletePreview] = useState<PreviewRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<PreviewRecord | null>(null);
  const [editorPalette, setEditorPalette] = useState<{ primary: string; secondary: string; background: string; text: string } | null>(null);
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
  const renderCardStylePicker = (section: string, label: string) => <div className="space-y-2"><Label className="text-xs font-semibold">Pilih Style Card · {label}</Label><div className="grid grid-cols-2 gap-2">{CARD_STYLES.map((style) => <button type="button" key={style.value} aria-pressed={editor?.editorConfig.sectionStyles[section] === style.value} onClick={() => editor && setEditor({ ...editor, editorConfig: { ...editor.editorConfig, sectionStyles: { ...editor.editorConfig.sectionStyles, [section]: style.value } } })} className={`rounded-lg border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7b4f] ${editor?.editorConfig.sectionStyles[section] === style.value ? "border-[#9a7b4f] bg-[#faf7f0] ring-1 ring-[#9a7b4f]" : "border-border hover:border-[#c8b58c]"}`}><CardStyleThumbnail style={style.value}/><span className="mt-2 block text-[11px] font-semibold">{style.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-muted-foreground">{style.description}</span></button>)}</div></div>;

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/previews/prospect/${prospectId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat preview sebelumnya");
        const data = (await res.json()) as PreviewRecord[];
        if (!cancelled) setPreviews(data);
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Riwayat preview belum dapat dimuat", description: "Periksa koneksi lalu muat ulang halaman.", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [prospectId]);

  const defaultEditorConfig = (): EditorState["editorConfig"] => ({
    heroTitle: "", heroDescription: "", heroButtonLabel: "", secondaryButtonLabel: "", whatsappLabel: "", footerText: "",
    accentColor: PREVIEW_PALETTES[colorScheme]?.primary ?? PREVIEW_PALETTES.ivory.primary,
    secondaryColor: PREVIEW_PALETTES[accentScheme]?.primary ?? PREVIEW_PALETTES.ivory.accent,
    backgroundColor: PREVIEW_PALETTES[colorScheme]?.background ?? PREVIEW_PALETTES.ivory.background,
    textColor: PREVIEW_PALETTES[colorScheme]?.text ?? PREVIEW_PALETTES.ivory.text,
    sectionVisibility: { hero: true, trust: true, categories: true, collection: true, products: true, services: true, gallery: true, about: true, cta: true, footer: true },
    sectionStyles: { services: initialCardStyle, gallery: initialCardStyle, products: initialCardStyle },
    galleryItems: [],
  });
  const applyLandingCopy = (copy: LandingCopy, current: EditorState): EditorState => ({
    ...current,
    tagline: copy.tagline,
    services: copy.services,
    aboutText: copy.aboutText,
    editorConfig: {
      ...current.editorConfig,
      heroTitle: copy.heroTitle,
      heroDescription: copy.heroDescription,
      heroButtonLabel: copy.heroButtonLabel,
      secondaryButtonLabel: copy.secondaryButtonLabel,
      whatsappLabel: copy.whatsappLabel,
      footerText: copy.footerText,
      galleryItems: copy.gallery.map((item, index) => ({
        ...item,
        imageUrl: current.editorConfig.galleryItems[index]?.imageUrl ?? current.galleryImageUrls[index] ?? "",
      })),
    },
  });

  useEffect(() => {
    const nextCategory = CATEGORY_OPTIONS.includes(category) ? category : "Company Profile";
    const nextColor = defaultColorFor(nextCategory);
    setTagline(""); setServices(""); setAboutText(""); setAssets({ logo: "", hero: "", gallery: [] });
    setPageCategory(nextCategory); setTemplateStyle(defaultTemplateFor(category)); setColorScheme(nextColor); setAccentScheme(defaultAccentFor(nextCategory));
  }, [prospectId, category]);

  const requestLandingCopy = async (options: { notes?: string; services?: string; pageCategory?: string; templateStyle?: string } = {}) => {
    const response = await apiFetch("/api/previews/generate-copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prospectId, pageCategory: options.pageCategory ?? pageCategory, templateStyle: options.templateStyle ?? templateStyle, notes: options.notes ?? (aiNotes || undefined), services: options.services ?? (draftServices || undefined) }) });
    const data = await response.json() as LandingCopy & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "AI gagal menghasilkan copy.");
    return data;
  };

  const generate = async () => {
    setGenerating(true);
    let generatedCopy: LandingCopy | undefined;
    let aiWarning = "";
    try {
      try {
        generatedCopy = await requestLandingCopy({ notes: aiNotes || undefined, services: services || undefined });
      } catch (error) {
        aiWarning = error instanceof Error ? error.message : "Z.ai tidak tersedia.";
      }

      const copy = generatedCopy;
      const editorConfig = defaultEditorConfig();
      if (copy) {
        editorConfig.heroTitle = copy.heroTitle;
        editorConfig.heroDescription = copy.heroDescription;
        editorConfig.heroButtonLabel = copy.heroButtonLabel;
        editorConfig.secondaryButtonLabel = copy.secondaryButtonLabel;
        editorConfig.whatsappLabel = copy.whatsappLabel;
        editorConfig.footerText = copy.footerText;
        editorConfig.galleryItems = copy.gallery.map((item, index) => ({ ...item, imageUrl: assets.gallery[index] ?? "" }));
      }
      const res = await apiFetch(`/api/previews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId,
          tagline: (copy?.tagline ?? tagline) || undefined,
          colorScheme,
          services: (copy?.services.join(", ") ?? services) || undefined,
          aboutText: (copy?.aboutText ?? aboutText) || undefined,
          pageCategory,
          templateStyle,
          logoUrl: assets.logo || undefined,
          heroImageUrl: assets.hero || undefined,
          galleryImageUrls: assets.gallery,
          editorConfig: { ...editorConfig, ...previewEditorConfig(editorConfig, colorScheme, accentScheme, pageCategory), accentColor: paletteForScheme(colorScheme).primary, secondaryColor: paletteForScheme(accentScheme).primary, backgroundColor: paletteForScheme(colorScheme).background, textColor: paletteForScheme(colorScheme).text, sectionStyles: { ...editorConfig.sectionStyles, services: initialCardStyle, gallery: initialCardStyle, products: initialCardStyle }, galleryItems: editorConfig.galleryItems.map((item) => ({ ...item, imageUrl: item.imageUrl || undefined })) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviews((prev) => [data, ...prev]);
      await openEditor(data as PreviewRecord);
      if (copy) {
        setTagline(copy.tagline);
        setServices(copy.services.join(", "));
        setAboutText(copy.aboutText);
        setDraftServices(copy.services.join(", "));
      }
      toast({ title: "Preview website berhasil dibuat", description: aiWarning ? `Z.ai tidak tersedia (${aiWarning}). Copy default digunakan; Anda tetap dapat generate ulang dari editor.` : "Copy awal dibuat otomatis oleh Z.ai. Tinjau fakta dan klaim sebelum membagikan." });
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
      const form = new FormData(); form.append("file", file); form.append("api_key", signed.apiKey); form.append("timestamp", String(signed.timestamp)); form.append("folder", signed.folder); form.append("allowed_formats", signed.allowedFormats.join(",")); form.append("signature", signed.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, { method: "POST", body: form });
      const uploaded = await response.json().catch(() => null);
      if (!response.ok || typeof uploaded.secure_url !== "string") throw new Error(cloudinaryUploadMessage(uploaded));
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
      const form = new FormData(); form.append("file", file); form.append("api_key", signed.apiKey); form.append("timestamp", String(signed.timestamp)); form.append("folder", signed.folder); form.append("allowed_formats", signed.allowedFormats.join(",")); form.append("signature", signed.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloudName)}/image/upload`, { method: "POST", body: form });
      const upload = await response.json().catch(() => null);
      if (!response.ok || typeof upload.secure_url !== "string") throw new Error(cloudinaryUploadMessage(upload));
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
      const recordPalette = paletteForScheme(data.colorScheme ?? "ivory");
      setEditorPalette({
        primary: data.editorConfig?.accentColor || recordPalette.primary,
        secondary: data.editorConfig?.secondaryColor || recordPalette.accent,
        background: data.editorConfig?.backgroundColor || recordPalette.background,
        text: data.editorConfig?.textColor || recordPalette.text,
      });
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
      const data = await requestLandingCopy({ notes: aiNotes || undefined, services: draftServices || undefined, pageCategory: activePreview?.pageCategory ?? pageCategory, templateStyle: activePreview?.templateStyle ?? templateStyle });
      setTagline(data.tagline); setServices(data.services.join(", ")); setAboutText(data.aboutText); setDraftServices(data.services.join(", "));
      setEditor((current) => current ? applyLandingCopy(data, current) : current);
      toast({ title: "Draft copy AI berhasil dibuat", description: "Silakan tinjau semua konten sebelum disimpan atau dibagikan." });
    } catch (error) { setEditorError(error instanceof Error ? error.message : "AI gagal menghasilkan copy."); }
    finally { setAiGenerating(false); }
  };

  const payloadForEditor = () => {
    if (!editor) throw new Error("Pilih preview yang akan diedit.");
    return {
      ...editor,
      logoUrl: editor.logoUrl || null,
      heroImageUrl: editor.heroImageUrl || null,
      editorConfig: { ...editor.editorConfig, galleryItems: editor.editorConfig.galleryItems.map((item) => ({ ...item, imageUrl: item.imageUrl || undefined })) },
    };
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

  const deletePreview = async (preview: PreviewRecord) => {
    setDeletingPreviewId(preview.id);
    try {
      const response = await apiFetch(`/api/previews/${preview.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error ?? "Preview gagal dihapus.");
      }
      const listResponse = await apiFetch(`/api/previews/prospect/${prospectId}?refresh=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      if (!listResponse.ok) throw new Error("Penghapusan dikirim, tetapi status riwayat belum dapat diverifikasi. Muat ulang lalu periksa kembali.");
      const remaining = await listResponse.json() as PreviewRecord[];
      if (remaining.some((item) => item.id === preview.id)) {
        setPreviews((current) => current.filter((item) => item.id !== preview.id));
        throw new Error("Penghapusan berhasil diterima, tetapi layanan masih mengembalikan salinan riwayat lama. Muat ulang lagi beberapa saat.");
      }
      setPreviews(remaining);
      if (activePreview?.id === preview.id) {
        setActivePreview(null); setEditor(null); setSavedEditor(null); setPreviewHtml("");
      }
      toast({ title: "Preview dihapus", description: "Penghapusan permanen sudah dikonfirmasi oleh server; link publik tidak lagi berlaku." });
    } catch (error) {
      toast({ title: "Penghapusan belum terverifikasi", description: error instanceof Error ? error.message : "Terjadi kesalahan.", variant: "destructive" });
    } finally { setDeletingPreviewId(null); }
  };

  const saveEditor = async () => {
    if (!activePreview || !editor) return;
    setEditorSaving(true); setEditorError("");
    try {
      const response = await apiFetch(`/api/previews/${activePreview.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadForEditor()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan perubahan.");
      setSavedEditor(editor);
      setEditorPalette({
        primary: editor.editorConfig.accentColor || paletteForScheme(editor.colorScheme).primary,
        secondary: editor.editorConfig.secondaryColor || paletteForScheme(editor.colorScheme).accent,
        background: editor.editorConfig.backgroundColor || paletteForScheme(editor.colorScheme).background,
        text: editor.editorConfig.textColor || paletteForScheme(editor.colorScheme).text,
      });
      setActivePreview((current) => current ? { ...current, token: data.token } : current);
      toast({ title: "Perubahan tersimpan", description: "URL preview tetap sama dan sudah menampilkan versi tersimpan." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan perubahan.";
      setEditorError(message);
      toast({ title: "Gagal menyimpan perubahan", description: message, variant: "destructive" });
    } finally { setEditorSaving(false); }
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
    if (!navigator.clipboard?.writeText) {
      toast({ title: "Tidak dapat menyalin link", description: "Clipboard tidak tersedia. Salin URL preview secara manual.", variant: "destructive" });
      return;
    }
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      window.setTimeout(() => setCopied(null), 2000);
      toast({ title: "Link preview disalin!" });
    }).catch(() => {
      toast({ title: "Tidak dapat menyalin link", description: "Periksa izin clipboard browser Anda.", variant: "destructive" });
    });
  };

  const openPreview = (token: string) => {
    const opened = window.open(`/preview/${token}`, "_blank", "noopener,noreferrer");
    if (!opened) toast({ title: "Preview siap dibuka", description: "Browser memblokir tab baru. Izinkan pop-up atau buka link preview secara manual." });
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
      {!activePreview && <Card className="ws-card min-w-0 overflow-hidden">
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
                  const nextColor = defaultColorFor(value);
                  setColorScheme(nextColor);
                  setAccentScheme(defaultAccentFor(value));
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
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="generator-ai-notes" className="text-xs">Arahan untuk Z.ai <span className="font-normal text-muted-foreground">(opsional)</span></Label><Textarea id="generator-ai-notes" placeholder="Contoh: tonjolkan layanan katering kantor, target HRD di Bekasi, gaya profesional dan hangat, ajak konsultasi via WhatsApp…" value={aiNotes} onChange={(event) => setAiNotes(event.target.value)} rows={3} className="resize-y rounded-lg text-sm"/><p className="text-[11px] leading-4 text-muted-foreground">Arahan ini dipakai saat Generate Preview dan Generate copy AI. Masukkan target pelanggan, keunggulan faktual, gaya bahasa, dan tujuan CTA.</p></div>
            </div>
          </section>

          {showAssetControls && <section className="space-y-3" aria-labelledby="generator-assets-title">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">3</span><div><h3 id="generator-assets-title" className="text-sm font-semibold">{supportsBusinessAssets ? "Personalisasi aset visual" : "Logo bisnis"}</h3><p className="text-[11px] text-muted-foreground">{supportsBusinessAssets ? "Unggah logo, foto utama, dan maksimal 3 foto galeri. JPG, PNG, WebP, AVIF · maks. 10 MB." : "Unggah logo untuk ditampilkan pada header preview. JPG, PNG, WebP, AVIF · maks. 10 MB."}</p></div></div>
            <div className={`grid gap-3 ${supportsBusinessAssets ? "sm:grid-cols-3" : "max-w-sm sm:grid-cols-3"}`}>{(supportsBusinessAssets ? ([ ["logo", "Logo bisnis", assets.logo], ["hero", "Foto hero", assets.hero], ["gallery", `Foto galeri (${assets.gallery.length}/3)`, ""] ] as const) : ([ ["logo", "Logo bisnis", assets.logo] ] as const)).map(([type, label, current]) => <div key={type} className="space-y-2 rounded-lg border border-border/70 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{label}</span>{current && <button type="button" className="text-muted-foreground hover:text-destructive" aria-label={`Hapus ${label}`} onClick={() => setAssets((previous) => ({ ...previous, [type]: "" }))}><X className="h-3.5 w-3.5" /></button>}</div>{current ? <img src={current} alt={`Pratinjau ${label}`} className="h-24 w-full rounded-md bg-muted object-contain" /> : <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-muted/25 text-center text-[10px] text-muted-foreground hover:bg-muted/50"><ImagePlus className="h-4 w-4" />Pilih gambar<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading !== null || (type === "gallery" && assets.gallery.length >= 3)} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAsset(file, type); event.currentTarget.value = ""; }} /></label>}{type === "gallery" && assets.gallery.map((url, index) => <div key={url} className="flex items-center gap-2"><img src={url} alt={`Foto galeri ${index + 1}`} className="h-10 w-10 rounded object-cover" /><button type="button" aria-label={`Hapus foto galeri ${index + 1}`} onClick={() => setAssets((previous) => ({ ...previous, gallery: previous.gallery.filter((_, itemIndex) => itemIndex !== index) }))}><X className="h-3.5 w-3.5" /></button></div>)}{uploading === type && <p className="text-[10px] text-muted-foreground">Mengunggah…</p>}</div>)}</div>
            <p className="text-[10px] leading-4 text-muted-foreground">Upload memakai signature server; API secret tidak dikirim ke browser. Perlu konfigurasi CLOUDINARY_* pada server.</p>
          </section>}

          <section className="space-y-3" aria-labelledby="generator-palette-title">
            <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{showAssetControls ? "4" : "3"}</span><div><h3 id="generator-palette-title" className="text-sm font-semibold">Pasangan warna rekomendasi</h3><p className="text-[11px] text-muted-foreground">Setiap pilihan memakai 2 warna utama yang dipasangkan khusus untuk kategori ini; latar dan teks otomatis dijaga agar kontras.</p></div></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{colorPairsForCategory(pageCategory).map(([baseColor, pairColor]) => {
              const base = COLOR_OPTIONS.find((option) => option.value === baseColor)!;
              const paired = COLOR_OPTIONS.find((option) => option.value === pairColor)!;
              const selected = colorScheme === baseColor && accentScheme === pairColor;
              return <button key={`${baseColor}-${pairColor}`} type="button" aria-label={`Gunakan pasangan warna ${base.label} dan ${paired.label}`} aria-pressed={selected} onClick={() => { setColorScheme(baseColor); setAccentScheme(pairColor); }} className={`flex min-h-12 min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/[0.045] text-foreground ring-1 ring-primary/20" : "border-border bg-white text-muted-foreground hover:border-primary/35 hover:text-foreground"}`}><span className="flex shrink-0 -space-x-1">{[base.color, paired.color].map((swatch) => <span key={swatch} className="h-6 w-6 rounded-full border-2 border-white shadow-sm ring-1 ring-black/10" style={{ backgroundColor: swatch }} />)}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{base.label} + {paired.label}</span><span className="block text-[10px] text-muted-foreground">Warna utama + aksen pasangan</span></span>{selected && <CheckCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}</button>;
            })}</div>
          </section>

          <section className="space-y-3" aria-labelledby="generator-card-style-title"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{showAssetControls ? "5" : "4"}</span><div><h3 id="generator-card-style-title" className="text-sm font-semibold">Pilih Style Card</h3><p className="text-[11px] text-muted-foreground">Tentukan tampilan kartu layanan, portfolio, dan produk pada preview pertama.</p></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{CARD_STYLES.map((style) => <button type="button" key={style.value} aria-pressed={initialCardStyle === style.value} onClick={() => setInitialCardStyle(style.value)} className={`rounded-lg border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a7b4f] ${initialCardStyle === style.value ? "border-[#9a7b4f] bg-[#faf7f0] ring-1 ring-[#9a7b4f]" : "border-border hover:border-[#c8b58c]"}`}><CardStyleThumbnail style={style.value}/><span className="mt-2 block text-[11px] font-semibold">{style.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-muted-foreground">{style.description}</span></button>)}</div></section>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-sm text-[11px] leading-5 text-muted-foreground">Hasil berupa preview website satu halaman. Tinjau konten sebelum membagikan link ke calon klien.</p>
            <Button onClick={() => void generate()} disabled={generating} className="h-11 w-full shrink-0 gap-2 rounded-lg px-5 sm:w-auto">
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" />Sedang membuat preview…</> : <><Wand2 className="h-4 w-4" />Generate Preview Website<ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>}

      {editor && activePreview && <section className="overflow-hidden rounded-2xl border border-[#e9e4dc] bg-[#faf9f6] shadow-sm" aria-label="Editor landing page">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9e4dc] bg-white px-4 py-3 sm:px-5"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#9a7b4f]">Studio editor · {activePreview.pageCategory ?? pageCategory}</p><h2 className="mt-1 truncate text-base font-semibold">Edit preview {businessName}</h2><p className="mt-1 text-[11px] text-muted-foreground">{dirty ? "Ada perubahan yang belum disimpan" : `Tersimpan ${new Date((savedEditor as EditorState & { updatedAt?: string })?.updatedAt ?? activePreview.createdAt).toLocaleString("id-ID")}`}</p></div><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={() => { setActivePreview(null); setEditor(null); setSavedEditor(null); setPreviewHtml(""); }}><X className="mr-1.5 h-3.5 w-3.5"/>Kembali ke generator</Button><Button size="sm" variant="outline" onClick={resetEditor} disabled={!dirty}>Reset</Button><Button size="sm" variant="outline" onClick={() => void editorShare()}><ExternalLink className="mr-1.5 h-3.5 w-3.5"/>Bagikan</Button><Button size="sm" onClick={() => void saveEditor()} disabled={!dirty || editorSaving}>{editorSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin"/> : <CheckCheck className="mr-1.5 h-3.5 w-3.5"/>}Simpan Perubahan</Button></div></div>
        <div className="grid min-w-0 items-start gap-4 p-3 lg:grid-cols-[minmax(220px,.8fr)_minmax(0,1.45fr)_minmax(220px,.75fr)] lg:p-4">
          <Card className="h-fit min-w-0 border-[#ebe6df] shadow-none lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"><CardHeader className="pb-3"><CardTitle className="text-sm">Konten website</CardTitle><CardDescription>Edit teks sebelum dikirim kepada klien.</CardDescription></CardHeader><CardContent>
            <Tabs defaultValue="content"><TabsList className="grid h-auto w-full grid-cols-4 bg-[#f5f2ed] p-1"><TabsTrigger value="content" className="px-1.5 text-[10px]">Konten</TabsTrigger><TabsTrigger value="images" className="px-1.5 text-[10px]">Gambar</TabsTrigger><TabsTrigger value="styles" className="px-1.5 text-[10px]">Style</TabsTrigger><TabsTrigger value="sections" className="px-1.5 text-[10px]">Bagian</TabsTrigger></TabsList>
              <TabsContent value="content" className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#eadfc9] bg-[#fbf7ee] p-3"><Label htmlFor="editor-ai-notes" className="text-xs font-semibold">Arahan prompt untuk Z.ai</Label><Textarea id="editor-ai-notes" value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} className="mt-2 min-h-16 bg-white text-xs" placeholder="Target pelanggan, gaya bahasa, keunggulan faktual, dan CTA yang diinginkan…"/><Button type="button" onClick={() => void generateCopy()} disabled={aiGenerating} className="mt-2 h-9 w-full gap-2 bg-[#9a7b4f] hover:bg-[#806440]">{aiGenerating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}Generate copy AI</Button><p className="mt-2 text-[10px] leading-4 text-muted-foreground">Z.ai memakai data prospek, kategori, template, dan arahan ini untuk membuat draft. Periksa klaim/fakta sebelum publish.</p></div>
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
              <TabsContent value="styles" className="mt-4 space-y-4"><div className="space-y-2"><Label className="text-xs">Warna utama</Label><Input type="color" value={editor.editorConfig.accentColor || editorPalette?.primary || PREVIEW_PALETTES[editor.colorScheme]?.primary || PREVIEW_PALETTES.ivory.primary} onChange={(e)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, accentColor: e.target.value } })}/><Label className="text-xs">Warna pasangan</Label><Input type="color" value={editor.editorConfig.secondaryColor || editorPalette?.secondary || PREVIEW_PALETTES[editor.colorScheme]?.accent || PREVIEW_PALETTES.ivory.accent} onChange={(e)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, secondaryColor: e.target.value } })}/><Label className="text-xs">Warna latar</Label><Input type="color" value={editor.editorConfig.backgroundColor || editorPalette?.background || PREVIEW_PALETTES[editor.colorScheme]?.background || PREVIEW_PALETTES.ivory.background} onChange={(e)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, backgroundColor: e.target.value } })}/><Label className="text-xs">Warna teks</Label><Input type="color" value={editor.editorConfig.textColor || editorPalette?.text || PREVIEW_PALETTES[editor.colorScheme]?.text || PREVIEW_PALETTES.ivory.text} onChange={(e)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, textColor: e.target.value } })}/><Button variant="outline" size="sm" onClick={()=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, accentColor: editorPalette?.primary || "", secondaryColor: editorPalette?.secondary || "", backgroundColor: editorPalette?.background || "", textColor: editorPalette?.text || "" } })}>Reset warna template</Button></div><div className="space-y-2"><Label className="text-xs font-semibold">Pilih Style Card · Layanan</Label><div className="grid grid-cols-2 gap-2">{CARD_STYLES.map((style)=> <button type="button" key={style.value} aria-pressed={editor.editorConfig.sectionStyles.services===style.value} onClick={()=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, sectionStyles: { ...editor.editorConfig.sectionStyles, services: style.value } } })} className={`rounded-lg border p-2 text-left ${editor.editorConfig.sectionStyles.services===style.value ? "border-[#9a7b4f] ring-1 ring-[#9a7b4f]" : "border-border"}`}><CardStyleThumbnail style={style.value}/><span className="block text-[11px] font-semibold">{style.label}</span><span className="block text-[9px] text-muted-foreground">{style.description}</span></button>)}</div>{renderCardStylePicker("gallery", "Portfolio / galeri")}{renderCardStylePicker("products", "Produk / katalog")}</div></TabsContent>
              <TabsContent value="sections" className="mt-4 space-y-3">{Object.entries(editor.editorConfig.sectionVisibility).map(([key,enabled])=><div key={key} className="flex items-center justify-between rounded-md border p-2.5"><Label className="text-xs capitalize">{key}</Label><Switch checked={enabled} onCheckedChange={(checked)=>setEditor({ ...editor, editorConfig: { ...editor.editorConfig, sectionVisibility: { ...editor.editorConfig.sectionVisibility, [key]: checked } } })}/></div>)}</TabsContent>
            </Tabs>
          </CardContent></Card>
          <Card className="min-w-0 overflow-hidden border-[#ebe6df] shadow-none lg:col-start-2 lg:row-start-1"><CardHeader className="flex-row items-center justify-between space-y-0 pb-3"><CardTitle className="text-sm">Live preview {dirty && <span className="ml-2 text-[10px] font-normal text-amber-700">· Belum disimpan</span>}</CardTitle><div className="flex gap-1"><Button size="sm" variant={viewport==="desktop"?"default":"outline"} onClick={()=>setViewport("desktop")}>Desktop</Button><Button size="sm" variant={viewport==="mobile"?"default":"outline"} onClick={()=>setViewport("mobile")}>Mobile</Button></div></CardHeader><CardContent className="p-2 pt-0"><div className="flex min-h-[460px] justify-center overflow-auto rounded-lg border bg-[#ece9e3] p-2"><iframe title={`Live preview ${businessName}`} srcDoc={previewHtml} sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox" className={`h-[min(78vh,900px)] min-h-[520px] border-0 bg-white shadow-md ${viewport==="mobile"?"w-[390px] max-w-full rounded-[28px] border-[8px] border-slate-800":"w-full"}`}/></div></CardContent></Card>
          <Card className="h-fit min-w-0 border-[#ebe6df] shadow-none lg:col-start-3 lg:row-start-1 lg:sticky lg:top-4"><CardHeader className="pb-3"><CardTitle className="text-sm">Pengaturan halaman</CardTitle><CardDescription>Perubahan terlihat langsung di preview.</CardDescription></CardHeader><CardContent className="space-y-3"><div><Label className="text-xs">Kategori</Label><p className="mt-1 text-sm font-medium">{activePreview.pageCategory ?? pageCategory}</p></div><div><Label className="text-xs">Style template</Label><p className="mt-1 text-sm">{TEMPLATE_OPTIONS.find(x=>x.value===activePreview.templateStyle)?.label ?? activePreview.templateStyle}</p></div><div className="rounded-lg border p-3"><Label className="text-xs">URL preview tetap</Label><code className="mt-2 block break-all text-[10px]">{window.location.origin}/preview/{activePreview.token}</code></div><Button variant="outline" className="w-full" onClick={()=>void refreshLivePreview()}><Eye className="mr-2 h-4 w-4"/>Perbarui Live Preview</Button></CardContent></Card>
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
                  <Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => waShare(preview.token)}><MessageSquare className="h-3.5 w-3.5" />Kirim WhatsApp</Button>
                  <AlertDialog open={pendingDeletePreview?.id === preview.id} onOpenChange={(open) => { if (!open) setPendingDeletePreview(null); }}><AlertDialogTrigger asChild><Button size="sm" variant="outline" className="h-9 gap-1.5 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/5" aria-label={`Hapus preview ${preview.pageCategory ?? businessName}`} disabled={deletingPreviewId === preview.id} onClick={() => setPendingDeletePreview(preview)}><Trash2 className="h-3.5 w-3.5" />Hapus</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus preview secara permanen?</AlertDialogTitle><AlertDialogDescription>Preview {preview.pageCategory ?? businessName} dan link publiknya akan dihapus. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setPendingDeletePreview(null); void deletePreview(preview); }}>Hapus permanen</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
