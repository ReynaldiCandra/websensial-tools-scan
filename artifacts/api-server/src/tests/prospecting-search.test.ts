import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import type { Express } from "express";
import request from "supertest";

const originalFetch = globalThis.fetch;
const API_KEY = "test-api-key";

let app!: Express;

before(async () => {
  // The search endpoint must work without a database. Removing the variable
  // before the app is imported makes @workspace/db take the "not configured"
  // path, so these tests never touch Neon.
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "production";
  process.env.LOG_LEVEL = "silent";
  process.env.ADMIN_API_KEY = API_KEY;
  delete process.env.SERPER_API_KEY;
  delete process.env.OUTSCRAPER_API_KEY;

  ({ default: app } = await import("../app"));
});

afterEach(() => {
  delete process.env.SERPER_API_KEY;
  delete process.env.OUTSCRAPER_API_KEY;
  delete process.env.SERPER_CREDIT_QUOTA;
  globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(body: string, status: number, contentType = "text/plain"): Response {
  return new Response(body, {
    status,
    headers: { "content-type": contentType },
  });
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>,
): void {
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => handler(String(input), init)) as typeof fetch;
}

const overpassElements = [
  {
    type: "node",
    id: 101,
    lat: -6.5971,
    lon: 106.806,
    tags: { name: "Laundry A", website: "https://a.example" },
  },
  {
    type: "node",
    id: 102,
    lat: -6.5971,
    lon: 106.806,
    tags: { name: "Laundry B" },
  },
  {
    type: "node",
    id: 103,
    lat: -6.5971,
    lon: 106.806,
    tags: {
      name: "Laundry C",
      phone: "+62 812-3456-7890",
      "addr:street": "Jl. Test",
      "addr:housenumber": "5",
    },
  },
];

describe("GET /api/prospecting/search", () => {
  it("filters out businesses with a website by default", async () => {
    mockFetch(async (url) => {
      if (url.includes("overpass-api.de")) {
        return jsonResponse({ elements: overpassElements });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await request(app)
      .get("/api/prospecting/search")
      .set("x-api-key", API_KEY)
      .query({ city: "Bogor", category: "Laundry" });

    assert.equal(res.status, 200);
    assert.equal(res.body.source, "overpass");
    assert.equal(res.body.cached, false);
    assert.equal(res.body.dbAvailable, false);
    assert.equal(res.body.total, 2);
    assert.deepEqual(
      res.body.results.map((row: { name: string }) => row.name),
      ["Laundry B", "Laundry C"],
    );

    const withPhone = res.body.results.find(
      (row: { name: string }) => row.name === "Laundry C",
    );
    assert.equal(withPhone.phone, "081234567890");
    assert.equal(withPhone.hasWebsite, false);
  });

  it("includes websites when onlyNoWebsite=false", async () => {
    mockFetch(async (url) => {
      if (url.includes("overpass-api.de")) {
        return jsonResponse({ elements: overpassElements });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await request(app)
      .get("/api/prospecting/search")
      .set("x-api-key", API_KEY)
      .query({ city: "Bogor", category: "Laundry", onlyNoWebsite: "false" });

    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    const withWebsite = res.body.results.find(
      (row: { name: string }) => row.name === "Laundry A",
    );
    assert.equal(withWebsite.hasWebsite, true);
    assert.equal(withWebsite.website, "https://a.example");
  });

  it("falls back to Photon when Overpass returns a plain-text error", async () => {
    // This is the exact production failure: Vercel/Overpass returned text
    // ("A server error has occurred") and the old client tried to JSON.parse it.
    mockFetch(async (url) => {
      if (url.includes("overpass")) {
        return textResponse("A server error has occurred", 500, "text/html");
      }
      if (url.includes("photon.komoot.io")) {
        return jsonResponse({
          features: [
            {
              properties: {
                osm_id: 201,
                osm_type: "N",
                osm_key: "shop",
                osm_value: "laundry",
                name: "Photon Laundry",
                street: "Jl. Photon",
                housenumber: "10",
                city: "Bogor",
              },
              geometry: { type: "Point", coordinates: [106.806, -6.597] },
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await request(app)
      .get("/api/prospecting/search")
      .set("x-api-key", API_KEY)
      .query({ city: "Bogor", category: "Laundry" });

    assert.equal(res.status, 200);
    assert.equal(res.body.source, "photon");
    assert.equal(res.body.total, 1);
    assert.equal(res.body.results[0].name, "Photon Laundry");
    assert.equal(res.body.results[0].hasWebsite, false);
  });

  it("prefers Serper Google Maps data when configured", async () => {
    process.env.SERPER_API_KEY = "test-serper-key";
    // Also configured: Serper must win so the free allowance is used first.
    process.env.OUTSCRAPER_API_KEY = "test-outscraper-key";

    let sentBody: unknown = null;
    let sentApiKey: string | undefined;

    mockFetch(async (url, init) => {
      if (url === "https://google.serper.dev/maps") {
        sentBody = init?.body ? JSON.parse(String(init.body)) : null;
        sentApiKey = (init?.headers as Record<string, string> | undefined)?.["X-API-KEY"];
        return jsonResponse({
          places: [
            {
              title: "Butik Serper",
              address: "Jl. Braga No. 2",
              latitude: -6.9175,
              longitude: 107.6191,
              rating: 4.8,
              ratingCount: 120,
              type: "Clothing store",
              phoneNumber: "+62 812-3456-7890",
              cid: "998877",
              placeId: "serper-place-1",
            },
            {
              title: "Butik Online",
              address: "Jl. Dago No. 3",
              website: "https://butik.example",
              rating: 4.6,
              ratingCount: 45,
              cid: "998878",
              placeId: "serper-place-2",
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await request(app)
      .get("/api/prospecting/search")
      .set("x-api-key", API_KEY)
      .query({ city: "Bandung", category: "Fashion" });

    assert.equal(res.status, 200);
    assert.equal(res.body.source, "serper");
    assert.equal(res.body.total, 1);
    assert.equal(res.body.results[0].name, "Butik Serper");
    assert.equal(res.body.results[0].phone, "081234567890");
    assert.equal(res.body.results[0].rating, "4.8");
    assert.equal(res.body.results[0].reviewCount, "120");
    assert.equal(res.body.results[0].hasWebsite, false);
    assert.equal(res.body.results[0].mapsUrl, "https://maps.google.com/?cid=998877");
    assert.equal(sentApiKey, "test-serper-key");
    assert.deepEqual(sentBody, { q: "butik, Bandung, Indonesia", gl: "id", hl: "id" });
  });

  it("uses Outscraper Google Maps data when configured", async () => {
    process.env.OUTSCRAPER_API_KEY = "test-outscraper-key";

    mockFetch(async (url) => {
      if (url.includes("api.outscraper.cloud")) {
        return jsonResponse({
          status: "Success",
          data: [
            [
              {
                name: "Fashion Lokal",
                full_address: "Jl. Braga No. 1",
                phone: "+62 812-3456-7890",
                site: null,
                rating: 4.8,
                reviews: 120,
                category: "Clothing store",
                latitude: -6.9175,
                longitude: 107.6191,
                location_link: "https://maps.google.com/?cid=123",
                place_id: "place-1",
                business_status: "OPERATIONAL",
              },
              {
                name: "Fashion Website",
                site: "https://fashion.example",
                rating: 4.5,
                reviews: 80,
                latitude: -6.9175,
                longitude: 107.6191,
                place_id: "place-2",
                business_status: "OPERATIONAL",
              },
            ],
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await request(app)
      .get("/api/prospecting/search")
      .set("x-api-key", API_KEY)
      .query({ city: "Bandung", category: "Fashion" });

    assert.equal(res.status, 200);
    assert.equal(res.body.source, "outscraper");
    assert.equal(res.body.total, 1);
    assert.equal(res.body.results[0].name, "Fashion Lokal");
    assert.equal(res.body.results[0].phone, "081234567890");
    assert.equal(res.body.results[0].rating, "4.8");
    assert.equal(res.body.results[0].reviewCount, "120");
    assert.equal(res.body.results[0].hasWebsite, false);
    assert.equal(res.body.results[0].mapsUrl, "https://maps.google.com/?cid=123");
  });

  it("retries Photon with the category label when the first query has no matching tags", async () => {
    let photonCalls = 0;

    mockFetch(async (url) => {
      if (url.includes("overpass")) {
        return textResponse("busy", 502, "text/plain");
      }
      if (url.includes("photon.komoot.io")) {
        photonCalls++;
        const query = new URL(url).searchParams.get("q");

        if (query === "laundry") {
          return jsonResponse({
            features: [
              {
                properties: {
                  osm_id: 301,
                  osm_key: "building",
                  osm_value: "yes",
                  name: "Bukan Laundry",
                },
                geometry: { type: "Point", coordinates: [106.806, -6.597] },
              },
            ],
          });
        }

        return jsonResponse({
          features: [
            {
              properties: {
                osm_id: 302,
                osm_key: "shop",
                osm_value: "laundry",
                name: "Laundry Fallback",
                street: "Jl. Fallback",
              },
              geometry: { type: "Point", coordinates: [106.806, -6.597] },
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await request(app)
      .get("/api/prospecting/search")
      .set("x-api-key", API_KEY)
      .query({ city: "Bogor", category: "Laundry" });

    assert.equal(res.status, 200);
    assert.equal(res.body.source, "photon");
    assert.equal(res.body.total, 1);
    assert.equal(res.body.results[0].name, "Laundry Fallback");
    assert.ok(photonCalls >= 2);
  });

  it("returns a JSON error when both data sources fail", async () => {
    mockFetch(async (url) => {
      if (url.includes("overpass")) {
        return textResponse("busy", 502, "text/plain");
      }
      if (url.includes("photon.komoot.io")) {
        return textResponse("down", 503, "text/plain");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await request(app)
      .get("/api/prospecting/search")
      .set("x-api-key", API_KEY)
      .query({ city: "Bogor", category: "Laundry" });

    assert.equal(res.status, 502);
    assert.match(res.headers["content-type"] ?? "", /application\/json/);
    assert.equal(typeof res.body.error, "string");
    assert.ok(res.body.error.length > 0);
  });

  it("rejects an unsupported city without calling any data source", async () => {
    let called = false;
    mockFetch(async () => {
      called = true;
      return textResponse("should not be called", 500);
    });

    const res = await request(app)
      .get("/api/prospecting/search")
      .set("x-api-key", API_KEY)
      .query({ city: "Atlantis", category: "Laundry" });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, "City 'Atlantis' not supported");
    assert.equal(called, false);
  });
});

describe("GET /api/prospecting/quota", () => {
  it("reports the free Serper allowance", async () => {
    process.env.SERPER_API_KEY = "test-serper-key";

    const res = await request(app)
      .get("/api/prospecting/quota")
      .set("x-api-key", API_KEY);

    assert.equal(res.status, 200);
    assert.equal(res.body.provider, "serper");
    assert.equal(res.body.configured, true);
    assert.equal(res.body.quota, 2500);
    // Tests run without DATABASE_URL, so recorded usage cannot be read.
    assert.equal(res.body.used, null);
    assert.equal(res.body.remaining, null);
    assert.equal(res.body.fallbackProvider, "osm");
  });

  it("accepts a custom quota and reports the fallback provider", async () => {
    process.env.OUTSCRAPER_API_KEY = "test-outscraper-key";
    process.env.SERPER_CREDIT_QUOTA = "10000";

    const res = await request(app)
      .get("/api/prospecting/quota")
      .set("x-api-key", API_KEY);

    assert.equal(res.status, 200);
    assert.equal(res.body.configured, false);
    assert.equal(res.body.quota, 10000);
    assert.equal(res.body.fallbackProvider, "outscraper");
  });

  it("requires the API key", async () => {
    const res = await request(app).get("/api/prospecting/quota");
    assert.equal(res.status, 401);
  });
});
