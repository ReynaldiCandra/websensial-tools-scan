import { Router } from "express";
import { db, previewsTable, prospectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod";
import { toWaNumber } from "../lib/phone";
import { cloudinaryUploadSignatureParams, getCloudinaryConfig, signCloudinaryParams } from "../lib/cloudinary-upload";
import { renderConstructionProfileHTML, renderFashionCatalogHTML, renderIndustryLandingHTML, renderPremiumProfileHTML, type PreviewPageData, type PreviewTemplateStyle } from "../lib/preview-html";
import { generateLandingCopy } from "../lib/landing-copy";
import { clientIp } from "../lib/rate-limit";
import { allowLandingCopyGeneration } from "../lib/landing-copy-limit";

const router = Router();
/** Public prospect demo link. Must be answerable without auth. */
export const publicPreviewsRouter = Router();

/**
 * Preview pages are plain HTML built with template strings, and their content
 * includes business names and taglines that come from Google Maps / CSV.
 * Without escaping, a business named `<img onerror=...>` would run script on
 * the public share link (same origin as the CRM).
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  }).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}

const CARD_STYLES = ["modern-minimal", "elegant-classic", "clean", "image-focus", "rounded", "glass"] as const;
const EditorConfigSchema = z.object({
  heroTitle: z.string().trim().max(120).optional(), heroDescription: z.string().trim().max(420).optional(),
  heroButtonLabel: z.string().trim().max(28).optional(), secondaryButtonLabel: z.string().trim().max(28).optional(),
  whatsappLabel: z.string().trim().max(28).optional(), footerText: z.string().trim().max(180).optional(),
  accentColor: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal("")]).optional(), secondaryColor: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal("")]).optional(), backgroundColor: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal("")]).optional(), textColor: z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal("")]).optional(),
  sectionVisibility: z.record(z.string().max(40), z.boolean()).optional(),
  sectionStyles: z.record(z.string().max(40), z.enum(CARD_STYLES)).optional(),
  galleryItems: z.array(z.object({ title: z.string().trim().max(55), caption: z.string().trim().max(120), imageUrl: z.string().url().optional() })).max(4).optional(),
});
const EditPreviewBody = z.object({
  tagline: z.string().trim().min(1).max(100), services: z.array(z.string().trim().min(1).max(100)).max(8),
  aboutText: z.string().trim().max(1200), colorScheme: z.string().trim().min(1).max(40),
  logoUrl: z.string().url().nullable(), heroImageUrl: z.string().url().nullable(),
  galleryImageUrls: z.array(z.string().url()).max(3), editorConfig: EditorConfigSchema,
});


const TEMPLATE_STYLES = [
  "classic",
  "fashion-catalog",
  "company-modern",
  "company-elegant",
  "company-minimal",
  "corporate-finance",
  "technology-saas",
  "creative-agency",
  "wellness-health",
  "conversion-landing",
  "hotel-property",
  "tour-travel",
  "online-course",
  "restaurant",
] as const satisfies readonly PreviewTemplateStyle[];

const CreatePreviewBody = z.object({
  prospectId: z.number(),
  tagline: z.string().optional(),
  colorScheme: z.string().optional().default("indigo"),
  pageCategory: z.string().trim().min(1).max(80).optional(),
  templateStyle: z.enum(TEMPLATE_STYLES).optional(),
  services: z.string().optional(),
  aboutText: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable(),
  galleryImageUrls: z.array(z.string().url()).max(3).optional(),
  editorConfig: EditorConfigSchema.optional(),
});



const COLOR_SCHEMES: Record<string, { primary: string; bg: string; accent: string; text: string; light: string }> = {
  indigo: { primary: "#4f46e5", bg: "#eef2ff", accent: "#6366f1", text: "#1e1b4b", light: "#e0e7ff" },
  emerald: { primary: "#059669", bg: "#ecfdf5", accent: "#10b981", text: "#064e3b", light: "#d1fae5" },
  amber: { primary: "#d97706", bg: "#fffbeb", accent: "#f59e0b", text: "#78350f", light: "#fef3c7" },
  rose: { primary: "#e11d48", bg: "#fff1f2", accent: "#f43f5e", text: "#881337", light: "#ffe4e6" },
  slate: { primary: "#475569", bg: "#f8fafc", accent: "#64748b", text: "#0f172a", light: "#e2e8f0" },
  violet: { primary: "#7c3aed", bg: "#f5f3ff", accent: "#8b5cf6", text: "#2e1065", light: "#ede9fe" },
  ivory: { primary: "#8a6e50", bg: "#faf7f0", accent: "#c0a77d", text: "#30271f", light: "#f1ebdf" },
  beige: { primary: "#987856", bg: "#f4eee5", accent: "#c2a887", text: "#392f25", light: "#e9ddcc" },
  taupe: { primary: "#7c6657", bg: "#f2eeea", accent: "#aa9382", text: "#302721", light: "#e5ddd5" },
  brown: { primary: "#795548", bg: "#f5eee9", accent: "#a9826b", text: "#34241d", light: "#ead9cb" },
  black: { primary: "#c6a76d", bg: "#171717", accent: "#e1c68f", text: "#f8f5ef", light: "#282522" },
  white: { primary: "#24466b", bg: "#ffffff", accent: "#7192b3", text: "#1f2937", light: "#f1f5f9" },
  navy: { primary: "#284c77", bg: "#f2f6fb", accent: "#6f91b8", text: "#162a43", light: "#dfe9f4" },
  charcoal: { primary: "#d0b477", bg: "#262a2f", accent: "#e5c879", text: "#f6f4ef", light: "#343a40" },
  "dark-slate": { primary: "#8ab4d6", bg: "#1e293b", accent: "#a6c9e6", text: "#f1f5f9", light: "#334155" },
  "soft-blue": { primary: "#477ba8", bg: "#f2f7fb", accent: "#7eadd0", text: "#203448", light: "#e0edf6" },
  "neon-accent": { primary: "#c6f36b", bg: "#17191d", accent: "#d6ff7f", text: "#f7f8f4", light: "#282c2d" },
  "sage-green": { primary: "#607b65", bg: "#f2f5f0", accent: "#91a58b", text: "#26352a", light: "#e3eae0" },
  "soft-rose": { primary: "#ad6878", bg: "#fbf3f4", accent: "#d9aab0", text: "#38272b", light: "#f2e2e5" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Kuliner": "🍽️",
  "Salon & Kecantikan": "💇",
  "Otomotif": "🔧",
  "Fashion": "👗",
  "Kesehatan": "🏥",
  "Apotek": "💊",
  "Fotografi": "📷",
  "Laundry": "👕",
  "Catering": "🍱",
  "Hotel & Penginapan": "🏨",
  "Pendidikan": "📚",
  "Toko Elektronik": "📱",
  "Toko Material": "🏗️",
  "Percetakan": "🖨️",
  "Furniture": "🪑",
};

const TEMPLATE_LABELS: Record<string, string> = {
  "corporate-finance": "CORPORATE · TRUSTED ADVISORY",
  "technology-saas": "TECHNOLOGY · BUILT FOR WHAT'S NEXT",
  "creative-agency": "INDEPENDENT CREATIVE STUDIO",
  "wellness-health": "WELLNESS · CARE IN EVERY DETAIL",
  "conversion-landing": "SOLUSI UNTUK KEBUTUHAN ANDA",
};

function getDefaultTagline(category: string, businessName: string): string {
  const map: Record<string, string> = {
    "Kuliner": `Cita Rasa Terbaik untuk Setiap Momen`,
    "Salon & Kecantikan": `Tampil Cantik & Percaya Diri Setiap Hari`,
    "Otomotif": `Perawatan Kendaraan Terpercaya & Profesional`,
    "Fashion": `Koleksi Terbaik untuk Penampilan Anda`,
    "Konstruksi & Renovasi": `Ruang Terencana, Kualitas yang Bertahan`,
    "Kesehatan": `Kesehatan Anda, Prioritas Kami`,
    "Apotek": `Obat Lengkap, Pelayanan Cepat & Terpercaya`,
    "Fotografi": `Mengabadikan Setiap Momen Berharga Anda`,
    "Laundry": `Bersih, Rapi, dan Wangi — Siap Tepat Waktu`,
    "Catering": `Hidangan Lezat untuk Setiap Acara Spesial`,
    "Restoran": `Tempat Bertemu, Rasa untuk Dikenang`,
    "Hotel & Penginapan": `Temukan Ruang untuk Beristirahat dan Menjelajah`,
    "Hotel / Property": `Temukan Ruang untuk Beristirahat dan Menjelajah`,
    "Tour & Travel": `Awali Perjalanan dengan Rencana yang Tepat`,
    "Online Course": `Belajar Hal Baru, Satu Langkah Sekaligus`,
    "Pendidikan": `Mendidik untuk Masa Depan yang Lebih Cerah`,
  };
  return map[category] ?? `Layanan Terbaik dari ${businessName}`;
}

function getDefaultServices(category: string): string {
  const map: Record<string, string> = {
    "Kuliner": "Makan Di Tempat,Pesan Antar,Paket Katering,Reservasi Meja",
    "Salon & Kecantikan": "Potong Rambut,Creambath,Facial,Nail Art,Make Up",
    "Otomotif": "Servis Rutin,Ganti Oli,Perbaikan Mesin,Cuci Motor/Mobil",
    "Fashion": "Baju Pria,Baju Wanita,Aksesoris,Custom Order",
    "Konstruksi & Renovasi": "Konstruksi Bangunan,Renovasi Hunian,Desain Interior,Konsultasi Proyek",
    "Hotel / Property": "Kamar dan Suite,Fasilitas Properti,Galeri Properti,Reservasi dan Informasi",
    "Tour & Travel": "Paket Perjalanan,Itinerary,Transportasi,Konsultasi Perjalanan",
    "Online Course": "Program Belajar,Kurikulum dan Silabus,Jadwal Kelas,Konsultasi Pendaftaran",
    "Restoran": "Menu Unggulan,Jam Operasional,Reservasi Meja,Informasi Lokasi",
    "Kesehatan": "Konsultasi Dokter,Pemeriksaan Umum,Laboratorium,Imunisasi",
    "Laundry": "Cuci Kiloan,Cuci Satuan,Express 3 Jam,Antar Jemput",
    "Catering": "Katering Pernikahan,Katering Kantoran,Nasi Kotak,Prasmanan",
    "Fotografi": "Foto Produk,Foto Pernikahan,Foto Keluarga,Video Cinematic",
  };
  return map[category] ?? "Layanan Utama,Konsultasi Gratis,Garansi Kepuasan,Harga Bersaing";
}

function getDefaultAbout(businessName: string, category: string): string {
  if (category === "Konstruksi & Renovasi") {
    return `Konsep profil ${businessName} untuk menampilkan layanan konstruksi, renovasi, dan desain. Lengkapi dengan profil, pengalaman, dan detail proyek aktual sebelum dipublikasikan.`;
  }
  const demoCopy: Record<string, string> = {
    "Hotel / Property": `Konsep halaman ${businessName} untuk menampilkan akomodasi, fasilitas, dan informasi properti. Ganti konten demo dengan detail aktual sebelum dipublikasikan.`,
    "Tour & Travel": `Konsep halaman ${businessName} untuk menampilkan inspirasi destinasi dan layanan perjalanan. Verifikasi paket, itinerary, dan informasi sebelum dipublikasikan.`,
    "Online Course": `Konsep halaman ${businessName} untuk memperkenalkan program dan informasi kelas. Lengkapi silabus, jadwal, biaya, serta klaim yang aktual.`,
    "Restoran": `Konsep halaman ${businessName} untuk memperkenalkan suasana dan menu restoran. Perbarui menu, alergen, jam buka, dan lokasi dengan informasi aktual.`,
  };
  if (demoCopy[category]) return demoCopy[category];
  return `${businessName} adalah usaha ${category.toLowerCase()} yang telah melayani pelanggan dengan dedikasi penuh. Kami berkomitmen memberikan pelayanan terbaik dengan kualitas yang tidak mengecewakan. Kepuasan pelanggan adalah prioritas utama kami.`;
}


function contrastText(hexColor: string): "#171717" | "#ffffff" {
  const hex = hexColor.replace("#", "");
  const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const luminance = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.179 ? "#171717" : "#ffffff";
}

function applyPreviewTheme(html: string, data: PreviewPageData & { templateStyle?: PreviewTemplateStyle }): string {
  const baseTheme = COLOR_SCHEMES[data.colorScheme] ?? COLOR_SCHEMES.ivory;
  const validHex = (value?: string) => Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));
  const theme = {
    ...baseTheme,
    primary: validHex(data.editorConfig?.accentColor) ? data.editorConfig!.accentColor! : baseTheme.primary,
    secondary: validHex(data.editorConfig?.secondaryColor) ? data.editorConfig!.secondaryColor! : baseTheme.accent,
    bg: validHex(data.editorConfig?.backgroundColor) ? data.editorConfig!.backgroundColor! : baseTheme.bg,
    text: validHex(data.editorConfig?.textColor) ? data.editorConfig!.textColor! : baseTheme.text,
    light: baseTheme.light,
  };
  const imageHero = data.templateStyle === "company-modern" && data.pageCategory === "Konstruksi & Renovasi"
    || ["hotel-property", "tour-travel", "online-course", "restaurant"].includes(data.templateStyle ?? "");
  const premiumHero = ["company-modern", "company-elegant", "company-minimal", "corporate-finance", "technology-saas", "creative-agency", "wellness-health", "conversion-landing"].includes(data.templateStyle ?? "");
  const darkHero = imageHero || (premiumHero && data.templateStyle !== "company-minimal") || data.templateStyle === "classic";
  const heroTextRules = darkHero
    ? ".hero h1,.hero p,.hero-inner h1,.hero-inner p,.hero .eyebrow,.hero-inner .eyebrow{color:#fff!important}"
    : ".hero h1,.hero p,.hero-inner h1,.hero-inner p{color:var(--preview-text)!important}.hero .eyebrow,.hero-inner .eyebrow{color:var(--preview-primary)!important}.hero{background-image:linear-gradient(135deg,var(--preview-background),color-mix(in srgb,var(--preview-background) 72%,var(--preview-primary)))!important}";
  const themeCss = `:root{--preview-primary:${theme.primary};--preview-secondary:${theme.secondary};--preview-background:${theme.bg};--preview-light:${theme.light};--preview-text:${theme.text};--preview-on-primary:${contrastText(theme.primary)}}html,body{background:var(--preview-background)!important;color:var(--preview-text)!important}.site-header,.header,nav{background-color:var(--preview-background)!important}.demo-banner,.demo-bar,.demo{background:var(--preview-text)!important;color:var(--preview-background)!important}.demo-banner strong,.demo-bar strong,.demo b{color:var(--preview-primary)!important}.brand-mark,.brand-symbol,.brand-text strong,.brand-name,.section-heading h2,.category-info strong,.product-info h3,.nav-links a,.main-nav a,.section-tag{color:var(--preview-text)!important}.eyebrow,.section-tag,.trust-icon,.category-info i,.product-category,.service-number,.service-arrow{color:var(--preview-primary)!important}.brand span,.service i,.visual-caption span{color:var(--preview-secondary)!important}.hero{color:var(--preview-text)!important}.hero-copy{background:var(--preview-background)!important;color:var(--preview-text)!important}.hero-copy h1,.hero-copy>p{color:var(--preview-text)!important}.hero-copy .eyebrow{color:var(--preview-primary)!important}${heroTextRules}.nav-cta,.button,.hero-cta,.wa-btn,.floating-contact,.floating-whatsapp,.cta{background:var(--preview-primary)!important;color:var(--preview-on-primary)!important}.contact,.contact-box{background:var(--preview-primary)!important;color:var(--preview-on-primary)!important}.contact h2,.contact p,.contact-box h3,.contact-box p{color:var(--preview-on-primary)!important}.site-footer,footer{background:var(--preview-text)!important;color:var(--preview-background)!important}.site-footer strong,footer strong{color:var(--preview-background)!important}.trust-icon,.section-tag{background:var(--preview-light)!important}.feature-strip,.trust-strip,.showcase,.visuals,.project-section,.about{background:color-mix(in srgb,var(--preview-background) 90%,var(--preview-text))!important}.category-card,.product-card,.visual-card,.service-card{background-color:var(--preview-background)!important;border-color:color-mix(in srgb,var(--preview-primary) 18%,transparent)}.floating-whatsapp{position:fixed;right:18px;bottom:18px;z-index:100;display:inline-flex;min-height:46px;align-items:center;gap:9px;padding:0 17px;border:1px solid #ffffff66;border-radius:999px;font:700 13px Inter,system-ui,sans-serif;text-decoration:none;box-shadow:0 8px 24px #0003}.floating-whatsapp:hover{filter:brightness(1.08);transform:translateY(-1px)}@media(max-width:640px){.floating-whatsapp{right:12px;bottom:12px;min-height:42px;padding:0 14px;font-size:12px}}`;
  let themedHtml = html.replace("</style>", `${themeCss}</style>`).replace("</head></head>", "</head>");
  if (!/class="floating-contact"|class="floating-whatsapp"/.test(themedHtml)) {
    const number = toWaNumber(data.phone);
    if (number) {
      const label = escapeHtml(data.editorConfig?.whatsappLabel || "WhatsApp");
      const link = `https://wa.me/${number}?text=${encodeURIComponent(`Halo ${data.ownerName ?? data.businessName}, saya ingin bertanya tentang ${data.businessName}.`)}`;
      themedHtml = themedHtml.replace("</body>", `<a class="floating-whatsapp" href="${link}" target="_blank" rel="noopener noreferrer" aria-label="Hubungi ${escapeHtml(data.businessName)} melalui WhatsApp"><span aria-hidden="true">◉</span>${label}</a></body>`);
    }
  }
  return themedHtml;
}

export function generatePreviewHTML(
  data: PreviewPageData & { pageCategory?: string; templateStyle?: PreviewTemplateStyle },
): string {
  let html: string;
  if (data.templateStyle === "fashion-catalog") {
    html = renderFashionCatalogHTML(data);
  } else if ((data.pageCategory ?? data.category) === "Konstruksi & Renovasi" && data.templateStyle === "company-modern") {
    html = renderConstructionProfileHTML(data);
  } else if (["hotel-property", "tour-travel", "online-course", "restaurant"].includes(data.templateStyle ?? "")) {
    html = renderIndustryLandingHTML(data, data.templateStyle as "hotel-property" | "tour-travel" | "online-course" | "restaurant");
  } else if (
    data.templateStyle === "company-modern" || data.templateStyle === "company-elegant" || data.templateStyle === "company-minimal" ||
    data.templateStyle === "corporate-finance" || data.templateStyle === "technology-saas" || data.templateStyle === "creative-agency" ||
    data.templateStyle === "wellness-health" || data.templateStyle === "conversion-landing"
  ) {
    html = renderPremiumProfileHTML(data, data.templateStyle);
  } else {
    html = generateClassicPreviewHTML(data);
  }
  return applyPreviewTheme(html, data);
}

function generateClassicPreviewHTML(data: PreviewPageData): string {
  const c = COLOR_SCHEMES[data.colorScheme] ?? COLOR_SCHEMES["indigo"];
  const icon = CATEGORY_ICONS[data.category] ?? "🏪";
  const waPhone = toWaNumber(data.phone);
  const waMsg = encodeURIComponent(`Halo ${data.ownerName ?? data.businessName}, saya tertarik dengan layanan ${data.businessName}. Boleh saya tahu lebih lanjut?`);

  // Semua nilai yang berasal dari data eksternal di-escape sebelum masuk HTML.
  const businessName = escapeHtml(data.businessName);
  const tagline = escapeHtml(data.tagline);
  const aboutText = escapeHtml(data.aboutText);
  const category = escapeHtml(data.category);
  const phone = escapeHtml(data.phone ?? "");
  const address = escapeHtml(data.address ?? "");

  const serviceCards = data.services.map((s) => `
    <div class="service-card">
      <div class="service-icon">${icon}</div>
      <h3>${escapeHtml(s.trim())}</h3>
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <meta name="description" content="${tagline}">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: ${c.primary};
      --bg: ${c.bg};
      --accent: ${c.accent};
      --text: ${c.text};
      --light: ${c.light};
    }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1f2937; background: #fff; }
    a { color: var(--primary); text-decoration: none; }

    /* NAV */
    nav {
      position: sticky; top: 0; z-index: 100;
      background: #fff; border-bottom: 1px solid #e5e7eb;
      padding: 0 5vw;
      display: flex; align-items: center; justify-content: space-between;
      height: 64px;
    }
    .nav-brand { font-weight: 800; font-size: 1.1rem; color: var(--text); }
    .nav-cta {
      background: var(--primary); color: #fff;
      padding: 8px 20px; border-radius: 999px;
      font-weight: 600; font-size: .875rem;
      transition: opacity .2s;
    }
    .nav-cta:hover { opacity: .85; }

    /* HERO */
    .hero {
      background: linear-gradient(135deg, var(--text) 0%, var(--primary) 100%);
      color: #fff; text-align: center;
      padding: 80px 5vw 100px;
      position: relative; overflow: hidden;
    }
    .hero::before {
      content: ''; position: absolute; inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .hero-icon { font-size: 3.5rem; margin-bottom: 16px; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin-bottom: 16px; }
    .hero p { font-size: 1.15rem; opacity: .9; max-width: 600px; margin: 0 auto 32px; }
    .hero-cta {
      display: inline-flex; align-items: center; gap: 10px;
      background: #fff; color: var(--primary);
      padding: 14px 32px; border-radius: 999px;
      font-weight: 700; font-size: 1rem;
      box-shadow: 0 4px 24px rgba(0,0,0,.15);
      transition: transform .2s, box-shadow .2s;
    }
    .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,.2); }

    /* SECTIONS */
    section { padding: 72px 5vw; }
    section:nth-child(even) { background: var(--bg); }
    .section-tag {
      display: inline-block; background: var(--light); color: var(--primary);
      font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
      padding: 4px 14px; border-radius: 999px; margin-bottom: 12px;
    }
    h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); font-weight: 800; color: var(--text); margin-bottom: 12px; }
    .section-subtitle { color: #6b7280; font-size: 1rem; max-width: 560px; line-height: 1.6; }
    .section-content { max-width: 960px; margin: 0 auto; }

    /* SERVICES GRID */
    .services-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px; margin-top: 40px;
    }
    .service-card {
      background: #fff; border-radius: 16px;
      padding: 28px 20px; text-align: center;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 4px rgba(0,0,0,.04);
      transition: transform .2s, box-shadow .2s;
    }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
    .service-icon { font-size: 2rem; margin-bottom: 12px; }
    .service-card h3 { font-size: .95rem; font-weight: 600; color: var(--text); }

    /* ABOUT */
    .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; margin-top: 40px; }
    @media (max-width: 640px) { .about-grid { grid-template-columns: 1fr; } }
    .about-visual {
      background: linear-gradient(135deg, var(--light) 0%, var(--bg) 100%);
      border-radius: 24px; height: 280px;
      display: flex; align-items: center; justify-content: center;
      font-size: 5rem;
    }
    .about-text p { color: #374151; line-height: 1.8; margin-bottom: 16px; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
    .badge {
      background: var(--light); color: var(--primary);
      font-size: .8rem; font-weight: 600;
      padding: 6px 14px; border-radius: 999px;
    }

    /* CONTACT */
    .contact-box {
      background: linear-gradient(135deg, var(--text) 0%, var(--primary) 100%);
      color: #fff; border-radius: 24px;
      padding: 48px; text-align: center;
      margin-top: 40px; max-width: 640px; margin-left: auto; margin-right: auto;
    }
    .contact-box h3 { font-size: 1.75rem; font-weight: 800; margin-bottom: 12px; }
    .contact-box p { opacity: .85; margin-bottom: 28px; }
    .wa-btn {
      display: inline-flex; align-items: center; gap: 10px;
      background: #25d366; color: #fff;
      padding: 14px 32px; border-radius: 999px;
      font-weight: 700; font-size: 1rem;
      transition: transform .2s; margin-bottom: 16px;
    }
    .wa-btn:hover { transform: translateY(-2px); }
    .contact-info { font-size: .9rem; opacity: .7; margin-top: 16px; }

    /* FOOTER */
    footer {
      background: var(--text); color: rgba(255,255,255,.6);
      text-align: center; padding: 24px 5vw;
      font-size: .8rem;
    }
    footer strong { color: #fff; }

    /* DEMO BANNER */
    .demo-banner {
      background: #1e1b4b; color: #fff;
      text-align: center; padding: 10px 20px;
      font-size: .8rem; letter-spacing: .02em;
    }
    .demo-banner a { color: #a5b4fc; font-weight: 600; }
  </style>
</head>
<body>

<div class="demo-banner">
  Ini adalah preview website untuk <strong>${businessName}</strong> — dibuat oleh <strong>Websensial</strong> &nbsp;·&nbsp;
  <a href="https://wa.me/6281234567890?text=Saya+ingin+website+seperti+ini" target="_blank">Hubungi kami</a>
</div>

<nav>
  <div class="nav-brand">${icon} ${businessName}</div>
  <a href="https://wa.me/${waPhone}?text=${waMsg}" class="nav-cta" target="_blank">Hubungi Kami</a>
</nav>

<section class="hero" style="padding-top:80px;padding-bottom:100px">
  <div class="hero-icon">${icon}</div>
  <h1>${businessName}</h1>
  <p>${tagline}</p>
  <a href="https://wa.me/${waPhone}?text=${waMsg}" class="hero-cta" target="_blank">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.12 1.532 5.848L.047 23.869c-.09.383.247.72.63.63l6.021-1.485A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.007-1.371l-.358-.213-3.716.917.935-3.618-.234-.372A9.817 9.817 0 012.182 12C2.182 6.565 6.565 2.182 12 2.182S21.818 6.565 21.818 12 17.435 21.818 12 21.818z"/></svg>
    Chat WhatsApp
  </a>
</section>

<section>
  <div class="section-content">
    <div class="section-tag">Layanan Kami</div>
    <h2>Apa yang Kami Tawarkan</h2>
    <p class="section-subtitle">Kami menyediakan berbagai layanan terbaik untuk memenuhi kebutuhan Anda.</p>
    <div class="services-grid">${serviceCards}</div>
  </div>
</section>

<section>
  <div class="section-content">
    <div class="about-grid">
      <div class="about-visual">${icon}</div>
      <div class="about-text">
        <div class="section-tag">Tentang Kami</div>
        <h2>Kenapa Memilih Kami?</h2>
        <p>${aboutText}</p>
        <div class="badge-row">
          <span class="badge">Terpercaya</span>
          <span class="badge">Berpengalaman</span>
          <span class="badge">Harga Terjangkau</span>
          <span class="badge">Pelayanan Ramah</span>
        </div>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="section-content">
    <div class="section-tag">Hubungi Kami</div>
    <h2>Siap Melayani Anda</h2>
    <div class="contact-box">
      <h3>Hubungi ${businessName}</h3>
      <p>Kami siap membantu Anda. Chat langsung via WhatsApp untuk respons cepat!</p>
      <div>
        <a href="https://wa.me/${waPhone}?text=${waMsg}" class="wa-btn" target="_blank">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.12 1.532 5.848L.047 23.869c-.09.383.247.72.63.63l6.021-1.485A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.007-1.371l-.358-.213-3.716.917.935-3.618-.234-.372A9.817 9.817 0 012.182 12C2.182 6.565 6.565 2.182 12 2.182S21.818 6.565 21.818 12 17.435 21.818 12 21.818z"/></svg>
          Chat WhatsApp Sekarang
        </a>
      </div>
      ${data.phone ? `<div class="contact-info">📞 ${phone}</div>` : ""}
      ${data.address ? `<div class="contact-info">📍 ${address}</div>` : ""}
    </div>
  </div>
</section>

<footer>
  <p>&copy; ${new Date().getFullYear()} <strong>${businessName}</strong> · ${category}</p>
  <p style="margin-top:6px">Website ini dibuat oleh <strong>Websensial</strong> · <a href="https://wa.me/6281234567890" style="color:#a5b4fc">Ingin website seperti ini? Hubungi kami!</a></p>
</footer>

</body>
</html>`;
}

function defaultTemplateForCategory(pageCategory: string): PreviewTemplateStyle {
  if (pageCategory === "Fashion" || pageCategory === "Fashion & Luxury") return "fashion-catalog";
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
}

// POST /api/previews/upload-signature — issue signed upload parameters; secret stays server-side.
router.post("/previews/upload-signature", (req, res) => {
  const parsed = z.object({ prospectId: z.number().int().positive(), assetType: z.enum(["logo", "hero", "gallery"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const config = getCloudinaryConfig();
  if (!config) return res.status(503).json({ error: "Upload belum dikonfigurasi. Atur CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET pada server." });
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `websensial/previews/${parsed.data.prospectId}`;
  const signedParams = cloudinaryUploadSignatureParams(timestamp, folder);
  return res.json({ cloudName: config.cloudName, apiKey: config.apiKey, timestamp, folder, signature: signCloudinaryParams(signedParams, config.apiSecret), maxFileBytes: 10 * 1024 * 1024 });
});

// POST /api/previews — create a preview
router.post("/previews", async (req, res) => {
  try {
    const parsed = CreatePreviewBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const { prospectId, tagline, colorScheme, services, aboutText } = parsed.data;
    const [prospect] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, prospectId));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });

    const token = randomBytes(12).toString("hex");

    const pageCategory = parsed.data.pageCategory ?? prospect.category;
    const selectedStyle = parsed.data.templateStyle ?? defaultTemplateForCategory(pageCategory);
    const finalTagline = tagline || getDefaultTagline(pageCategory, prospect.businessName);
    const finalServices = services || getDefaultServices(pageCategory);
    const finalAbout = aboutText || getDefaultAbout(prospect.businessName, pageCategory);
    const finalColor = colorScheme || "indigo";
    const mediaUrls = [parsed.data.logoUrl, parsed.data.heroImageUrl, ...(parsed.data.galleryImageUrls ?? []), ...(parsed.data.editorConfig?.galleryItems ?? []).map((item) => item.imageUrl)].filter((url): url is string => Boolean(url));
    if (mediaUrls.some((value) => { try { const url = new URL(value); return url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || Boolean(url.username || url.password); } catch { return true; } })) {
      return res.status(400).json({ error: "Media URL tidak valid; gunakan aset Cloudinary yang diunggah melalui generator." });
    }
    const templateStyle = selectedStyle;

    const [row] = await db
      .insert(previewsTable)
      .values({
        token,
        prospectId,
        businessName: prospect.businessName,
        ownerName: prospect.ownerName,
        category: prospect.category,
        phone: prospect.phone,
        address: prospect.address,
        tagline: finalTagline,
        colorScheme: finalColor,
        pageCategory,
        templateStyle,
        services: finalServices,
        aboutText: finalAbout,
        logoUrl: parsed.data.logoUrl ?? null,
        heroImageUrl: parsed.data.heroImageUrl ?? null,
        galleryImageUrls: JSON.stringify(parsed.data.galleryImageUrls ?? []),
        editorConfig: parsed.data.editorConfig ?? {},
      })
      .returning();

    return res.status(201).json({
      id: row.id,
      token: row.token,
      previewUrl: `/preview/${row.token}`,
      pageCategory: row.pageCategory,
      templateStyle: row.templateStyle,
      colorScheme: row.colorScheme,
      viewCount: row.viewCount,
      createdAt: row.createdAt.toISOString(),
      editorConfig: row.editorConfig,
      tagline: row.tagline,
      services: (row.services ?? "").split(",").filter(Boolean),
      aboutText: row.aboutText,
      logoUrl: row.logoUrl,
      heroImageUrl: row.heroImageUrl,
      galleryImageUrls: JSON.parse(row.galleryImageUrls ?? "[]") as string[],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create preview");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Generate structured Indonesian copy from prospect facts. API key remains server-side.
router.post("/previews/generate-copy", async (req, res) => {
  const parsed = z.object({ prospectId: z.number().int().positive(), pageCategory: z.string().trim().min(1).max(80), templateStyle: z.enum(TEMPLATE_STYLES), notes: z.string().trim().max(700).optional(), services: z.string().trim().max(480).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const limit = allowLandingCopyGeneration(clientIp(req));
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return res.status(429).json({ error: `Batas generate copy AI tercapai. Coba lagi dalam ${limit.retryAfterSeconds} detik.` });
  }
  try {
    const [prospect] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, parsed.data.prospectId));
    if (!prospect) return res.status(404).json({ error: "Prospek tidak ditemukan." });
    const copy = await generateLandingCopy({ businessName: prospect.businessName, businessCategory: prospect.category, pageCategory: parsed.data.pageCategory, templateStyle: parsed.data.templateStyle, address: prospect.address, notes: parsed.data.notes, services: parsed.data.services });
    return res.json(copy);
  } catch (error) {
    req.log.warn({ err: error }, "Landing page copy generation failed");
    return res.status(502).json({ error: error instanceof Error ? error.message : "Gagal membuat konten AI." });
  }
});

// Save edits to the existing preview, preserving its public token.
router.put("/previews/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "ID preview tidak valid." });
  const parsed = EditPreviewBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((issue) => `${issue.path.join(".") || "data"}: ${issue.message}`).join("; ") });
  const urls = [parsed.data.logoUrl, parsed.data.heroImageUrl, ...parsed.data.galleryImageUrls, ...(parsed.data.editorConfig.galleryItems ?? []).map((item) => item.imageUrl ?? null)].filter((value): value is string => Boolean(value));
  if (urls.some((value) => { try { const url = new URL(value); return url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || Boolean(url.username || url.password); } catch { return true; } })) return res.status(400).json({ error: "Media URL tidak valid; gunakan gambar yang diunggah ke Cloudinary." });
  try {
    const [updated] = await db.update(previewsTable).set({ tagline: parsed.data.tagline, services: parsed.data.services.join(","), aboutText: parsed.data.aboutText, colorScheme: parsed.data.colorScheme, logoUrl: parsed.data.logoUrl, heroImageUrl: parsed.data.heroImageUrl, galleryImageUrls: JSON.stringify(parsed.data.galleryImageUrls), editorConfig: parsed.data.editorConfig, updatedAt: new Date() }).where(eq(previewsTable.id, id)).returning({ id: previewsTable.id, token: previewsTable.token, updatedAt: previewsTable.updatedAt });
    if (!updated) return res.status(404).json({ error: "Preview tidak ditemukan." });
    return res.json({ ...updated, previewUrl: `/preview/${updated.token}` });
  } catch (error) {
    req.log.error({ err: error }, "Failed to save landing page preview");
    return res.status(500).json({ error: "Perubahan preview gagal disimpan." });
  }
});

router.get("/previews/:id/editor", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "ID preview tidak valid." });
  try {
    const [row] = await db.select().from(previewsTable).where(eq(previewsTable.id, id));
    if (!row) return res.status(404).json({ error: "Preview tidak ditemukan." });
    return res.json({ id: row.id, token: row.token, businessName: row.businessName, ownerName: row.ownerName, category: row.category, phone: row.phone, address: row.address, pageCategory: row.pageCategory, templateStyle: row.templateStyle, colorScheme: row.colorScheme, tagline: row.tagline, services: (row.services ?? "").split(",").filter(Boolean), aboutText: row.aboutText, logoUrl: row.logoUrl, heroImageUrl: row.heroImageUrl, galleryImageUrls: JSON.parse(row.galleryImageUrls ?? "[]") as string[], editorConfig: row.editorConfig ?? {}, updatedAt: row.updatedAt.toISOString() });
  } catch (error) {
    req.log.error({ err: error }, "Failed to load landing page editor");
    return res.status(500).json({ error: "Editor preview gagal dimuat." });
  }
});

// Render unsaved editor state through the real template for immediate preview.
router.post("/previews/:id/render", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "ID preview tidak valid." });
  const parsed = EditPreviewBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((issue) => `${issue.path.join(".") || "data"}: ${issue.message}`).join("; ") });
  try {
    const [row] = await db.select().from(previewsTable).where(eq(previewsTable.id, id));
    if (!row) return res.status(404).json({ error: "Preview tidak ditemukan." });
    const html = generatePreviewHTML({
      businessName: row.businessName, ownerName: row.ownerName, category: row.category,
      pageCategory: row.pageCategory, phone: row.phone, address: row.address,
      tagline: parsed.data.tagline, services: parsed.data.services, aboutText: parsed.data.aboutText,
      colorScheme: parsed.data.colorScheme, templateStyle: row.templateStyle as PreviewTemplateStyle,
      logoUrl: parsed.data.logoUrl, heroImageUrl: parsed.data.heroImageUrl,
      galleryImageUrls: parsed.data.galleryImageUrls, editorConfig: parsed.data.editorConfig,
    });
    return res.json({ html });
  } catch (error) {
    req.log.error({ err: error }, "Failed to render unsaved preview changes");
    return res.status(500).json({ error: "Preview tidak dapat dirender." });
  }
});

// GET /api/previews/prospect/:id — list previews for a prospect
router.delete("/previews/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "ID preview tidak valid." });
  try {
    const [deleted] = await db.delete(previewsTable).where(eq(previewsTable.id, id)).returning({ id: previewsTable.id });
    if (!deleted) return res.status(404).json({ error: "Preview tidak ditemukan." });
    return res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Failed to delete landing page preview");
    return res.status(500).json({ error: "Preview gagal dihapus." });
  }
});

router.get("/previews/prospect/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(previewsTable)
      .where(eq(previewsTable.prospectId, id));
    return res.json(
      rows.map((r) => ({
        id: r.id,
        token: r.token,
        previewUrl: `/preview/${r.token}`,
        colorScheme: r.colorScheme,
        pageCategory: r.pageCategory,
        templateStyle: r.templateStyle,
        isActive: r.isActive,
        viewCount: r.viewCount,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list previews");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export function previewContentSecurityPolicy(templateStyle: string, pageCategory: string): string {
  const allowsRemoteImages = [
    "fashion-catalog", "hotel-property", "tour-travel", "online-course", "restaurant",
    "company-modern", "company-elegant", "company-minimal", "corporate-finance",
    "technology-saas", "creative-agency", "wellness-health", "conversion-landing",
  ].includes(templateStyle) || (pageCategory === "Konstruksi & Renovasi" && templateStyle === "company-modern");
  return allowsRemoteImages
    ? "default-src 'none'; style-src 'unsafe-inline'; img-src https://images.unsplash.com https://res.cloudinary.com data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    : "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
}

// GET /preview/:token — serve the HTML page (public)
publicPreviewsRouter.get("/preview/:token", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(previewsTable)
      .where(eq(previewsTable.token, req.params.token));

    if (!row || !row.isActive) {
      return res.status(404).send("<h1>Preview tidak ditemukan</h1>");
    }

    // increment view count
    await db
      .update(previewsTable)
      .set({ viewCount: row.viewCount + 1 })
      .where(eq(previewsTable.id, row.id));

    const services = (row.services ?? getDefaultServices(row.category))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const html = generatePreviewHTML({
      businessName: row.businessName,
      ownerName: row.ownerName,
      category: row.category,
      pageCategory: row.pageCategory,
      phone: row.phone,
      address: row.address,
      tagline: row.tagline ?? getDefaultTagline(row.pageCategory, row.businessName),
      services,
      aboutText: row.aboutText ?? getDefaultAbout(row.businessName, row.pageCategory),
      logoUrl: row.logoUrl,
      heroImageUrl: row.heroImageUrl,
      galleryImageUrls: JSON.parse(row.galleryImageUrls ?? "[]") as string[],
      editorConfig: row.editorConfig ?? {},
      colorScheme: row.colorScheme,
      templateStyle: row.templateStyle as PreviewTemplateStyle,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=63072000");
    }
    // Defense in depth: escaping already removes markup from business data, but
    // this page is public and needs no script at all, so even a missed escape
    // cannot execute JavaScript here.
    res.setHeader("Content-Security-Policy", previewContentSecurityPolicy(row.templateStyle, row.pageCategory));
    return res.send(html);
  } catch (err) {
    req.log.error({ err }, "Failed to serve preview");
    return res.status(500).send("<h1>Server error</h1>");
  }
});

export { previewsTable };
export default router;
