import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Express } from "express";
import { Pool } from "pg";
import request from "supertest";

const API_KEY = "test-api-key";
const baseUrl = process.env.DATABASE_URL;
const dbName = `test_prospecting_${Date.now()}_${Math.random()
  .toString(36)
  .slice(2, 8)}`;

// Skip instead of failing when the test runner has no database configured.
// Run `npm test` normally (it loads ../../.env.local) to execute this suite.
const describeWithDb = baseUrl ? describe : describe.skip;

let app!: Express;
let admin: Pool | undefined;
let appPool: Pool | undefined;

describeWithDb("POST /api/prospecting/bulk-import", () => {
  before(async () => {
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "silent";
    process.env.ADMIN_API_KEY = API_KEY;

    // Use a throwaway database so the test never touches real prospects.
    admin = new Pool({ connectionString: baseUrl });
    await admin.query(`CREATE DATABASE "${dbName}"`);

    const testUrl = new URL(baseUrl!);
    testUrl.pathname = `/${dbName}`;
    process.env.DATABASE_URL = testUrl.toString();

    const dbModule = await import("@workspace/db");
    const pool = dbModule.pool;
    appPool = pool;
    await pool.query(`
      CREATE TABLE prospects (
        id serial PRIMARY KEY,
        business_name text NOT NULL,
        owner_name text,
        phone text NOT NULL,
        address text,
        category text DEFAULT 'Umum' NOT NULL,
        source text DEFAULT 'manual' NOT NULL,
        has_website boolean DEFAULT false NOT NULL,
        current_website text,
        status text DEFAULT 'belum_dihubungi' NOT NULL,
        notes text,
        rating numeric(2, 1),
        maps_url text,
        deal_value numeric(15, 2),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);

    ({ default: app } = await import("../app"));
  });

  after(async () => {
    await appPool?.end().catch(() => {});
    await admin?.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => {});
    await admin?.end().catch(() => {});
  });

  it("imports selected prospects into the pipeline", async () => {
    const name = `Test Laundry ${Date.now()}`;

    const res = await request(app)
      .post("/api/prospecting/bulk-import")
      .set("x-api-key", API_KEY)
      .send({
        prospects: [
          {
            businessName: name,
            phone: "08123456789",
            address: "Jl. Test No. 1",
            category: "Laundry",
            hasWebsite: false,
            mapsUrl: "https://maps.google.com/?q=-6.6,106.8",
          },
        ],
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.imported, 1);
    assert.equal(res.body.ids.length, 1);

    const list = await request(app)
      .get("/api/prospects")
      .set("x-api-key", API_KEY)
      .query({ search: name });
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].businessName, name);
    assert.equal(list.body[0].phone, "08123456789");
    assert.equal(list.body[0].status, "belum_dihubungi");
    assert.equal(list.body[0].source, "gmaps");
    assert.equal(list.body[0].hasWebsite, false);
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await request(app)
      .post("/api/prospecting/bulk-import")
      .set("x-api-key", API_KEY)
      .send({ prospects: "not-an-array" });

    assert.equal(res.status, 400);
    assert.equal(typeof res.body.error, "string");
  });

  it("defaults a missing phone to '-'", async () => {
    const res = await request(app)
      .post("/api/prospecting/bulk-import")
      .set("x-api-key", API_KEY)
      .send({
        prospects: [{ businessName: "No Phone Laundry", category: "Laundry" }],
      });

    assert.equal(res.status, 201);

    const list = await request(app)
      .get("/api/prospects")
      .set("x-api-key", API_KEY)
      .query({ search: "No Phone Laundry" });

    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].phone, "-");
  });
});
