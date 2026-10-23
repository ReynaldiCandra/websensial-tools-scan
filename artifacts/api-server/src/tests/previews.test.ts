import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Express } from "express";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { db, previewsTable, prospectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const API_KEY = "test-api-key";

// Run only when the test runner has a database (npm test loads ../../.env.local).
const hasDb = Boolean(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);
const describeWithDb = hasDb ? describe : describe.skip;

const token = randomBytes(12).toString("hex");
const businessName = `Warung Uji <Preview> ${Date.now()}`;

let app!: Express;
let prospectId: number | undefined;

describeWithDb("public preview link", () => {
  before(async () => {
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "silent";
    process.env.ADMIN_API_KEY = API_KEY;
    process.env.SESSION_SECRET = "test-session-secret";

    ({ default: app } = await import("../app"));

    const [prospect] = await db
      .insert(prospectsTable)
      .values({
        businessName,
        phone: "081234567890",
        category: "Kuliner",
      })
      .returning();
    prospectId = prospect.id;

    await db.insert(previewsTable).values([
      {
        token,
        prospectId: prospect.id,
        businessName,
        category: "Kuliner",
        phone: "081234567890",
        tagline: "Tagline uji",
        services: "Layanan A,Layanan B",
        aboutText: "Tentang uji",
      },
      {
        token: randomBytes(12).toString("hex"),
        prospectId: prospect.id,
        businessName,
        category: "Fashion",
        phone: "081234567890",
        tagline: "Gaya pilihan untuk setiap hari",
        colorScheme: "rose",
        pageCategory: "Fashion",
        templateStyle: "fashion-catalog",
        services: "Koleksi demo",
        aboutText: "Produk dan harga contoh untuk presentasi.",
      },
      {
        token: randomBytes(12).toString("hex"),
        prospectId: prospect.id,
        businessName,
        category: "Kuliner",
        pageCategory: "Company Profile",
        phone: "081234567890",
        tagline: "Membangun kualitas masa depan",
        templateStyle: "company-elegant",
        services: "Konsultasi,Solusi Terintegrasi",
        aboutText: "Company profile premium untuk uji tampilan.",
      },
      {
        token: randomBytes(12).toString("hex"),
        prospectId: prospect.id,
        businessName,
        category: "Toko Material",
        pageCategory: "Konstruksi & Renovasi",
        phone: "081234567890",
        tagline: "Ruang terencana untuk masa depan",
        colorScheme: "navy",
        templateStyle: "company-modern",
        services: "Konstruksi Bangunan,Renovasi Hunian,Desain Interior",
        aboutText: "Konsep halaman perusahaan konstruksi untuk uji tampilan.",
      },
    ]);
  });

  after(async () => {
    if (prospectId !== undefined) {
      // Previews cascade with the prospect.
      await db.delete(prospectsTable).where(eq(prospectsTable.id, prospectId));
    }
  });

  // The link shared via WhatsApp is `/preview/<token>` (no `/api` prefix) and
  // Vercel rewrites that path to this function, so it must answer at the root.
  it("serves the shared /preview/:token path without a session or API key", async () => {
    const res = await request(app).get(`/preview/${token}`);

    assert.equal(res.status, 200);
    assert.match(String(res.headers["content-type"]), /text\/html/);
    // Scraped business names are escaped, never rendered as markup.
    assert.match(res.text, /Warung Uji &lt;Preview&gt;/);
    assert.match(String(res.headers["content-security-policy"]), /default-src 'none'/);
    assert.equal(res.headers["strict-transport-security"], "max-age=63072000");
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.equal(res.headers["referrer-policy"], "strict-origin-when-cross-origin");
    assert.equal(res.headers["permissions-policy"], "camera=(), microphone=(), geolocation=()");

    const [row] = await db.select().from(previewsTable).where(eq(previewsTable.token, token));
    assert.equal(row.viewCount, 1);
  });

  it("creates a preview using the selected category and UI style", async () => {
    const created = await request(app)
      .post("/api/previews")
      .set("x-api-key", API_KEY)
      .send({
        prospectId,
        pageCategory: "Fashion",
        templateStyle: "fashion-catalog",
        colorScheme: "rose",
      });

    assert.equal(created.status, 201);
    assert.equal(created.body.pageCategory, "Fashion");
    assert.equal(created.body.templateStyle, "fashion-catalog");
    assert.equal(created.body.colorScheme, "rose");

    const preview = await request(app).get(created.body.previewUrl);
    assert.equal(preview.status, 200);
    assert.match(preview.text, /Fashion · Koleksi pilihan/);
    assert.match(preview.text, /Jelajahi Koleksi/);
    assert.match(preview.text, /product-grid/);
  });

  it("defaults construction category previews to the modern company template", async () => {
    const created = await request(app)
      .post("/api/previews")
      .set("x-api-key", API_KEY)
      .send({ prospectId, pageCategory: "Konstruksi & Renovasi" });

    assert.equal(created.status, 201);
    assert.equal(created.body.templateStyle, "company-modern");

    const preview = await request(app).get(created.body.previewUrl);
    assert.equal(preview.status, 200);
    assert.match(preview.text, /VISUAL DEMO/);
  });

  it("creates a preview with editor colors reset and saves premium card styles", async () => {
    const created = await request(app)
      .post("/api/previews")
      .set("x-api-key", API_KEY)
      .send({
        prospectId,
        pageCategory: "Company Profile",
        templateStyle: "company-modern",
        editorConfig: {
          accentColor: "",
          secondaryColor: "",
          backgroundColor: "",
          textColor: "",
          sectionStyles: { services: "glass", gallery: "elegant-classic" },
        },
      });
    assert.equal(created.status, 201);
    assert.equal(created.body.editorConfig.accentColor, "");
    assert.equal(created.body.editorConfig.secondaryColor, "");

    const preview = await request(app).get(created.body.previewUrl);
    assert.equal(preview.status, 200);
    assert.match(preview.text, /data-card-style="glass"/);
    assert.match(preview.text, /data-card-style="elegant-classic"/);
    assert.match(preview.text, /backdrop-filter:blur\(12px\)/);
    assert.doesNotMatch(preview.text, /testimonial-card|article-card/);
  });

  it("deletes a preview permanently and invalidates its public link", async () => {
    const created = await request(app)
      .post("/api/previews")
      .set("x-api-key", API_KEY)
      .send({ prospectId, pageCategory: "Company Profile", templateStyle: "company-modern" });
    assert.equal(created.status, 201);

    const deleted = await request(app)
      .delete(`/api/previews/${created.body.id}`)
      .set("x-api-key", API_KEY);
    assert.equal(deleted.status, 204);
    assert.match(String(deleted.headers["cache-control"]), /no-store/);

    const history = await request(app).get(`/api/previews/prospect/${prospectId}`).set("x-api-key", API_KEY);
    assert.equal(history.status, 200);
    assert.match(String(history.headers["cache-control"]), /no-store/);
    assert.equal(history.body.some((preview: { id: number }) => preview.id === created.body.id), false);
    const refreshHistory = await request(app).get(`/api/previews/prospect/${prospectId}?refresh=1`).set("x-api-key", API_KEY).set("Cache-Control", "no-cache");
    assert.equal(refreshHistory.status, 200);
    assert.equal(refreshHistory.body.some((preview: { id: number }) => preview.id === created.body.id), false);

    const publicPage = await request(app).get(created.body.previewUrl);
    assert.equal(publicPage.status, 404);

    const missing = await request(app)
      .delete(`/api/previews/${created.body.id}`)
      .set("x-api-key", API_KEY);
    assert.equal(missing.status, 404);
  });

  it("rejects unknown UI styles instead of silently accepting them", async () => {
    const res = await request(app)
      .post("/api/previews")
      .set("x-api-key", API_KEY)
      .send({ prospectId, templateStyle: "untrusted-style" });

    assert.equal(res.status, 400);
  });

  it("renders a premium fashion editorial landing page with clearly marked demo content", async () => {
    const rows = await db.select().from(previewsTable).where(eq(previewsTable.prospectId, prospectId!));
    const fashion = rows.find((row) => row.templateStyle === "fashion-catalog");
    assert.ok(fashion);

    const res = await request(app).get(`/preview/${fashion.token}`);

    assert.equal(res.status, 200);
    assert.match(res.text, /product-grid/);
    assert.match(res.text, /Blazer Linen Classic/);
    assert.match(res.text, /Foto dan produk pada halaman ini adalah contoh demo/);
    assert.match(res.text, /Kategori pilihan/);
    assert.match(res.text, /Koleksi terbaru/);
    assert.match(res.text, /wa\.me\/6281234567890/);
    assert.match(res.text, /images\.unsplash\.com/);
    assert.doesNotMatch(String(res.headers["content-security-policy"]), /script-src/);
    assert.doesNotMatch(res.text, /<script/i);
    assert.doesNotMatch(res.text, /react|vite|stylesheet href/i);
  });

  it("renders company profile styles as standalone premium HTML", async () => {
    const rows = await db.select().from(previewsTable).where(eq(previewsTable.prospectId, prospectId!));
    const elegant = rows.find((row) => row.templateStyle === "company-elegant");
    assert.ok(elegant);

    const res = await request(app).get(`/preview/${elegant.token}`);

    assert.equal(res.status, 200);
    assert.match(res.text, /WEBSENSIAL WEBSITE CONCEPT/);
    assert.match(res.text, /Mengutamakan kualitas di setiap detail/);
    assert.match(String(res.headers["content-security-policy"]), /default-src 'none'/);
    assert.doesNotMatch(res.text, /<script|react|vite/i);
  });

  it("renders a construction company profile with architecture visuals and demo portfolio labels", async () => {
    const rows = await db.select().from(previewsTable).where(eq(previewsTable.prospectId, prospectId!));
    const construction = rows.find((row) => row.pageCategory === "Konstruksi & Renovasi");
    assert.ok(construction);

    const res = await request(app).get(`/preview/${construction.token}`);

    assert.equal(res.status, 200);
    assert.match(res.text, /Konstruksi · Renovasi · Interior/);
    assert.match(res.text, /Inspirasi proyek/);
    assert.match(res.text, /VISUAL DEMO/);
    assert.match(res.text, /bukan portofolio pekerjaan/);
    assert.match(res.text, /images\.unsplash\.com/);
    assert.match(res.text, /Konsultasi via WhatsApp/);
    assert.match(String(res.headers["content-security-policy"]), /img-src https:\/\/images\.unsplash\.com/);
    assert.doesNotMatch(res.text, /<script|react|vite/i);
  });

  it("also answers /api/preview/:token", async () => {
    const res = await request(app).get(`/api/preview/${token}`);

    assert.equal(res.status, 200);
    assert.match(String(res.headers["content-type"]), /text\/html/);
  });

  it("shows the not-found page for an unknown token", async () => {
    const res = await request(app).get(`/preview/${"0".repeat(24)}`);

    assert.equal(res.status, 404);
    assert.match(res.text, /Preview tidak ditemukan/);
  });

  it("keeps the preview list behind auth", async () => {
    const res = await request(app).get(`/api/previews/prospect/${prospectId}`);

    assert.equal(res.status, 401);
  });
});
