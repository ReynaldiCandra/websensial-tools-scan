import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderConstructionProfileHTML, renderFashionCatalogHTML, renderIndustryLandingHTML, type PreviewPageData } from "../lib/preview-html";
import { generatePreviewHTML } from "../routes/previews";

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

  it("personalizes industry logo and hero with safe Cloudinary assets only", () => {
    const html = renderIndustryLandingHTML({ ...base, logoUrl: "https://res.cloudinary.com/demo/image/upload/logo.png", heroImageUrl: "https://res.cloudinary.com/demo/image/upload/hero.png", galleryImageUrls: ["javascript:alert(1)"] }, "restaurant");
    assert.ok(html.includes('src="https://res.cloudinary.com/demo/image/upload/logo.png"'));
    assert.ok(html.includes('src="https://res.cloudinary.com/demo/image/upload/hero.png"'));
    assert.match(html, /VISUAL DEMO/); assert.doesNotMatch(html, /src="javascript:/i);
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
