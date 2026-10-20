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

    await db.insert(previewsTable).values({
      token,
      prospectId: prospect.id,
      businessName,
      category: "Kuliner",
      phone: "081234567890",
      tagline: "Tagline uji",
      services: "Layanan A,Layanan B",
      aboutText: "Tentang uji",
    });
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

    const [row] = await db.select().from(previewsTable).where(eq(previewsTable.token, token));
    assert.equal(row.viewCount, 1);
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
