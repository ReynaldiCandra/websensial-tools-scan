import { Router } from "express";
import { db, previewsTable, prospectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod";
import { toWaNumber } from "../lib/phone";

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
  });
}

const CreatePreviewBody = z.object({
  prospectId: z.number(),
  tagline: z.string().optional(),
  colorScheme: z.string().optional().default("indigo"),
  services: z.string().optional(),
  aboutText: z.string().optional(),
});

const COLOR_SCHEMES: Record<string, { primary: string; bg: string; accent: string; text: string; light: string }> = {
  indigo: { primary: "#4f46e5", bg: "#eef2ff", accent: "#6366f1", text: "#1e1b4b", light: "#e0e7ff" },
  emerald: { primary: "#059669", bg: "#ecfdf5", accent: "#10b981", text: "#064e3b", light: "#d1fae5" },
  amber: { primary: "#d97706", bg: "#fffbeb", accent: "#f59e0b", text: "#78350f", light: "#fef3c7" },
  rose: { primary: "#e11d48", bg: "#fff1f2", accent: "#f43f5e", text: "#881337", light: "#ffe4e6" },
  slate: { primary: "#475569", bg: "#f8fafc", accent: "#64748b", text: "#0f172a", light: "#e2e8f0" },
  violet: { primary: "#7c3aed", bg: "#f5f3ff", accent: "#8b5cf6", text: "#2e1065", light: "#ede9fe" },
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

function getDefaultTagline(category: string, businessName: string): string {
  const map: Record<string, string> = {
    "Kuliner": `Cita Rasa Terbaik untuk Setiap Momen`,
    "Salon & Kecantikan": `Tampil Cantik & Percaya Diri Setiap Hari`,
    "Otomotif": `Perawatan Kendaraan Terpercaya & Profesional`,
    "Fashion": `Koleksi Terbaik untuk Penampilan Anda`,
    "Kesehatan": `Kesehatan Anda, Prioritas Kami`,
    "Apotek": `Obat Lengkap, Pelayanan Cepat & Terpercaya`,
    "Fotografi": `Mengabadikan Setiap Momen Berharga Anda`,
    "Laundry": `Bersih, Rapi, dan Wangi — Siap Tepat Waktu`,
    "Catering": `Hidangan Lezat untuk Setiap Acara Spesial`,
    "Hotel & Penginapan": `Kenyamanan & Kehangatan di Setiap Malam`,
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
    "Kesehatan": "Konsultasi Dokter,Pemeriksaan Umum,Laboratorium,Imunisasi",
    "Laundry": "Cuci Kiloan,Cuci Satuan,Express 3 Jam,Antar Jemput",
    "Catering": "Katering Pernikahan,Katering Kantoran,Nasi Kotak,Prasmanan",
    "Fotografi": "Foto Produk,Foto Pernikahan,Foto Keluarga,Video Cinematic",
  };
  return map[category] ?? "Layanan Utama,Konsultasi Gratis,Garansi Kepuasan,Harga Bersaing";
}

function getDefaultAbout(businessName: string, category: string): string {
  return `${businessName} adalah usaha ${category.toLowerCase()} yang telah melayani pelanggan dengan dedikasi penuh. Kami berkomitmen memberikan pelayanan terbaik dengan kualitas yang tidak mengecewakan. Kepuasan pelanggan adalah prioritas utama kami.`;
}


function generatePreviewHTML(data: {
  businessName: string;
  ownerName?: string | null;
  category: string;
  phone: string;
  address?: string | null;
  tagline: string;
  services: string[];
  aboutText: string;
  colorScheme: string;
  token: string;
}): string {
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

// POST /api/previews — create a preview
router.post("/previews", async (req, res) => {
  try {
    const parsed = CreatePreviewBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const { prospectId, tagline, colorScheme, services, aboutText } = parsed.data;
    const [prospect] = await db.select().from(prospectsTable).where(eq(prospectsTable.id, prospectId));
    if (!prospect) return res.status(404).json({ error: "Prospect not found" });

    const token = randomBytes(12).toString("hex");

    const finalTagline = tagline || getDefaultTagline(prospect.category, prospect.businessName);
    const finalServices = services || getDefaultServices(prospect.category);
    const finalAbout = aboutText || getDefaultAbout(prospect.businessName, prospect.category);
    const finalColor = colorScheme || "indigo";

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
        services: finalServices,
        aboutText: finalAbout,
      })
      .returning();

    return res.status(201).json({
      id: row.id,
      token: row.token,
      previewUrl: `/preview/${row.token}`,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create preview");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/previews/prospect/:id — list previews for a prospect
router.get("/previews/prospect/:id", async (req, res) => {
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
      phone: row.phone,
      address: row.address,
      tagline: row.tagline ?? getDefaultTagline(row.category, row.businessName),
      services,
      aboutText: row.aboutText ?? getDefaultAbout(row.businessName, row.category),
      colorScheme: row.colorScheme,
      token: row.token,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Defense in depth: escaping already removes markup from business data, but
    // this page is public and needs no script at all, so even a missed escape
    // cannot execute JavaScript here.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    return res.send(html);
  } catch (err) {
    req.log.error({ err }, "Failed to serve preview");
    return res.status(500).send("<h1>Server error</h1>");
  }
});

export { previewsTable };
export default router;
