import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderConstructionProfileHTML, renderFashionCatalogHTML, renderIndustryLandingHTML, renderPremiumProfileHTML, type PreviewPageData } from "../lib/preview-html";
import { generatePreviewHTML, previewContentSecurityPolicy } from "../routes/previews";

const base: PreviewPageData = {
  businessName: "Studio Uji <Demo>",
  ownerName: "Pemilik",
  category: "Fashion",
  phone: "081234567890",
  tagline: "Gaya untuk setiap hari",
  services: ["Konsultasi", "Koleksi pilihan"],
  aboutText: "Deskripsi demo <script>alert(1)</script>",
  colorScheme: "ivory",
};

describe("preview landing page renderers", () => {
  it("renders fashion as an editorial landing page and keeps contact/product links functional", () => {
    const html = renderFashionCatalogHTML(base);

    assert.match(html, /<nav class="main-nav"/);
    assert.match(html, /id="kategori"/);
    assert.match(html, /id="koleksi"/);
    assert.match(html, /id="produk"/);
    assert.match(html, /id="kontak"/);
    assert.match(html, /Foto dan produk pada halaman ini adalah contoh demo/);
    assert.match(html, /wa\.me\/6281234567890/);
    assert.match(html, /@media\(max-width:640px\)/);
    assert.match(html, /loading="lazy"/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/i);
    assert.doesNotMatch(html, /Rp 289\.000|Diskon 26%|Stok: 24/);
    assert.match(html, /Studio Uji &lt;Demo&gt;/);
  });

  it("renders four dedicated industry designs with responsive behavior and working contact links", () => {
    const expectations = [
      ["hotel-property", /HOSPITALITY · STAYS · PROPERTY/, /Temukan tempat yang terasa tepat/],
      ["tour-travel", /TRAVEL · JOURNEYS · DISCOVERY/, /Ceritakan perjalanan yang Anda impikan/],
      ["online-course", /LEARN · PRACTICE · GROW/, /Siap memilih kelas berikutnya/],
      ["restaurant", /A TABLE · A MOMENT · A STORY/, /Kami siapkan meja untuk Anda/],
    ] as const;
    for (const [industry, eyebrow, contact] of expectations) {
      const html = renderIndustryLandingHTML({ ...base, pageCategory: industry }, industry);
      assert.match(html, eyebrow); assert.match(html, contact); assert.match(html, /VISUAL DEMO/);
      assert.match(html, /@media\(max-width:760px\)/); assert.match(html, /wa\.me\/6281234567890/);
      assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/i);
    }
  });

  it("routes selected industry style through the public preview generator", () => {
    const html = generatePreviewHTML({ ...base, pageCategory: "Restoran", templateStyle: "restaurant" });
    assert.match(html, /A TABLE · A MOMENT · A STORY/); assert.match(html, /id="pilihan"/);
  });

  it("applies the selected ivory palette consistently and adds a floating WhatsApp action", () => {
    const html = generatePreviewHTML({
      ...base,
      pageCategory: "Company Profile",
      templateStyle: "company-modern",
      colorScheme: "ivory",
      phone: "081234567890",
    });
    assert.match(html, /--preview-primary:#8a6e50/);
    assert.match(html, /--preview-background:#faf7f0/);
    assert.match(html, /--preview-text:#30271f/);
    assert.match(html, /class="floating-whatsapp" href="https:\/\/wa\.me\/6281234567890/);
    assert.match(html, /Hubungi .* melalui WhatsApp/);
    assert.match(html, /--preview-light:#f1ebdf/);
    assert.match(html, /\.hero h1,\.hero p,\.hero-inner h1,\.hero-inner p,\.hero \.eyebrow,\.hero-inner \.eyebrow\{color:#fff!important\}/);
    assert.doesNotMatch(html, /--preview-primary:#059669|--preview-background:#ecfdf5/);
  });

  it("keeps a template's existing floating WhatsApp link without adding a duplicate", () => {
    const html = generatePreviewHTML({ ...base, templateStyle: "fashion-catalog" });
    assert.match(html, /class="floating-contact"/);
    assert.doesNotMatch(html, /class="floating-whatsapp"/);
  });

  it("personalizes industry logo and hero with safe Cloudinary assets only", () => {
    const html = renderIndustryLandingHTML({ ...base, logoUrl: "https://res.cloudinary.com/demo/image/upload/logo.png", heroImageUrl: "https://res.cloudinary.com/demo/image/upload/hero.png", galleryImageUrls: ["javascript:alert(1)"] }, "restaurant");
    assert.ok(html.includes('src="https://res.cloudinary.com/demo/image/upload/logo.png"'));
    assert.ok(html.includes('src="https://res.cloudinary.com/demo/image/upload/hero.png"'));
    assert.match(html, /VISUAL DEMO/); assert.doesNotMatch(html, /src="javascript:/i);
  });

  it("shows an uploaded Cloudinary logo in the company profile header", () => {
    const html = generatePreviewHTML({ ...base, category: "Company Profile", pageCategory: "Company Profile", templateStyle: "company-modern", logoUrl: "https://res.cloudinary.com/demo/image/upload/company-logo.png" });
    assert.match(html, /class="brand-logo" src="https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/company-logo\.png" alt="Logo Studio Uji &lt;Demo&gt;"/);
  });

  it("renders image-led premium profile templates with safe uploaded hero and gallery assets", () => {
    const styles = ["company-modern", "company-elegant", "company-minimal", "corporate-finance", "technology-saas", "creative-agency", "wellness-health", "conversion-landing"] as const;
    for (const style of styles) {
      const html = renderPremiumProfileHTML({
        ...base,
        category: "Layanan profesional",
        pageCategory: "Teknologi & SaaS",
        heroImageUrl: "https://res.cloudinary.com/demo/image/upload/hero.jpg",
        galleryImageUrls: ["https://res.cloudinary.com/demo/image/upload/one.jpg", "javascript:alert(1)", "https://res.cloudinary.com/demo/image/upload/three.jpg"],
        services: ["Strategi", "Implementasi", "Dukungan", "Integrasi", "Analitik", "Konsultasi", "Di luar batas"],
      }, style);

      assert.match(html, /class="hero-visual"/);
      assert.match(html, /class="visual-grid"/);
      assert.match(html, /VISUAL DEMO/);
      assert.match(html, /FOTO BISNIS/);
      assert.match(html, /hero\.jpg/);
      assert.match(html, /one\.jpg/);
      assert.match(html, /three\.jpg/);
      assert.doesNotMatch(html, /javascript:alert/);
      assert.doesNotMatch(html, /Di luar batas/);
      assert.match(html, /@media\(max-width:700px\)/);
      assert.match(html, /wa\.me\/6281234567890/);
      assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/i);
    }
  });

  it("keeps article and testimonial sections out of all landing page templates", () => {
    const templates = [
      generatePreviewHTML(base),
      renderFashionCatalogHTML(base),
      renderConstructionProfileHTML(base),
      renderPremiumProfileHTML(base, "company-modern"),
      renderIndustryLandingHTML(base, "restaurant"),
    ];

    for (const html of templates) {
      assert.doesNotMatch(html, /id="(?:testimoni|artikel)"/);
      assert.doesNotMatch(html, /testimonial-card|article-card|IDE ARTIKEL/);
    }
  });

  it("applies saved section visibility and copy to the construction renderer", () => {
    const html = renderConstructionProfileHTML({
      ...base,
      editorConfig: {
        heroTitle: "Judul Bisnis",
        heroDescription: "Deskripsi bisnis yang ditulis sesuai fakta dan kategori perusahaan.",
        sectionVisibility: { hero: false, trust: false, services: false, gallery: false, about: false, cta: false, footer: false },
      },
    });
    assert.doesNotMatch(html, /class="hero"|class="trust-strip"|id="layanan"|id="proyek"|id="proses"|id="kontak"|<footer/);
    assert.match(html, /KONSEP WEBSITE/);
  });

  it("applies selected card styles to industry service and gallery cards", () => {
    const html = renderIndustryLandingHTML({
      ...base,
      editorConfig: { sectionStyles: { services: "glass", gallery: "elegant-classic" } },
    }, "restaurant");
    assert.match(html, /class="service-card" data-card-style="glass"/);
    assert.match(html, /class="showcase-card" data-card-style="elegant-classic"/);
    assert.match(html, /backdrop-filter:blur\(12px\)/);
    assert.match(html, /border-color:#c8b58c/);
  });

  it("uses image-led demo visuals with explicit demo ownership notes when no business photos are provided", () => {
    const html = generatePreviewHTML({ ...base, category: "Company Profile", pageCategory: "Company Profile", templateStyle: "company-modern" });
    assert.match(html, /images\.unsplash\.com/);
    assert.match(html, /VISUAL DEMO · INSPIRASI/);
    assert.match(html, /bukan portofolio atau hasil kerja terverifikasi/);
    assert.match(html, /Nama, caption, dan semua klaim juga harus diverifikasi/);
  });

  it("allows only required remote image hosts for company profile previews", () => {
    const csp = previewContentSecurityPolicy("company-modern", "Company Profile");
    assert.match(csp, /img-src https:\/\/images\.unsplash\.com https:\/\/res\.cloudinary\.com data:/);
    assert.doesNotMatch(csp, /script-src|https:\/\/example\.com/);
    assert.doesNotMatch(previewContentSecurityPolicy("classic", "Company Profile"), /https:\/\/res\.cloudinary\.com/);
  });

  it("renders construction as a visual company profile with transparent demo portfolio", () => {
    const html = renderConstructionProfileHTML({
      ...base,
      category: "Konstruksi & Renovasi",
      colorScheme: "navy",
      tagline: "Ruang dirancang untuk masa depan",
      services: ["Konstruksi", "Renovasi"],
    });

    assert.match(html, /Konstruksi · Renovasi · Interior/);
    assert.match(html, /https:\/\/images\.unsplash\.com/);
    assert.match(html, /Inspirasi proyek/);
    assert.match(html, /VISUAL DEMO/);
    assert.match(html, /bukan portofolio pekerjaan/);
    assert.match(html, /id="layanan"/);
    assert.match(html, /id="proses"/);
    assert.match(html, /id="kontak"/);
    assert.match(html, /@media\(max-width:760px\)/);
    assert.match(html, /wa\.me\/6281234567890/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/i);
  });
});
