import { Router } from "express";
import {
  db,
  isDatabaseConfigured,
  overpassCacheTable,
  prospectsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { csvToRecords, type CsvRecord } from "../lib/csv";
import { logger } from "../lib/logger";

const OVERPASS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam — data bisnis lokal jarang berubah harian
const CACHE_RETRY_AFTER_FAILURE_MS = 60 * 1000;

// Usage counters reuse the cache table as a namespaced key-value store, so no
// extra migration is needed. Each entry is `{ count: number }`.
const USAGE_KEY_PREFIX = "usage::";

// A paused/deleted database should not add a connection attempt to every
// search. After one failure, skip the cache for a minute before retrying.
let cacheDisabledUntil = 0;

// Vercel functions here are limited to 60 seconds (see vercel.json), so the
// whole search must finish before that. Public Overpass mirrors are often at
// capacity, so try a few of them in order instead of failing on the first 5xx.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const OVERPASS_ATTEMPT_TIMEOUT_MS = 12_000;
const OVERPASS_TOTAL_BUDGET_MS = 24_000;

// Photon (Komoot) is built on the same OpenStreetMap data but responds much
// faster and is far less likely to be at capacity. It does not expose phone or
// website tags, so Overpass is still tried first for the "no website" filter.
const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";
const PHOTON_TIMEOUT_MS = 20_000;

// Serper (google.serper.dev) returns real Google Maps results — name, rating,
// review count, phone and website — from a single synchronous request. Its
// free allowance needs no credit card (unlike Outscraper, which blocks the API
// key until credits are added), so it is the preferred provider.
const SERPER_ENDPOINT = "https://google.serper.dev/maps";
const SERPER_TIMEOUT_MS = 20_000;
const SERPER_LIMIT = 20;
// Free allowance of a fresh Serper account. Once it runs out the dashboard
// shows a warning, and searches still work through the OSM fallback.
const SERPER_FREE_CREDITS = 2_500;

// Outscraper provides the same Google Maps data and stays supported as a
// fallback for accounts that already have credits. Both are optional: without
// either key the endpoint keeps using OSM.
const OUTSCRAPER_ENDPOINT = "https://api.outscraper.cloud/google-maps-search";
const OUTSCRAPER_TIMEOUT_MS = 45_000;
const OUTSCRAPER_LIMIT = 20;

const CATEGORY_KEYWORDS: Record<string, string> = {
  "Kuliner": "restoran",
  "Salon & Kecantikan": "salon",
  "Otomotif": "bengkel",
  "Fashion": "butik",
  "Kesehatan": "klinik",
  "Apotek": "apotek",
  "Fotografi": "foto",
  "Laundry": "laundry",
  "Catering": "catering",
  "Hotel & Penginapan": "hotel",
  "Pendidikan": "sekolah",
  "Toko Elektronik": "elektronik",
  "Toko Material": "bangunan",
  "Percetakan": "percetakan",
  "Furniture": "furniture",
  "Jasa Umum": "servis",
  "Gym & Kebugaran": "gym",
  "Pet Shop & Hewan": "pet shop",
  "Servis Elektronik": "servis elektronik",
};

const CATEGORY_PHOTON_TAGS: Record<string, string[]> = {
  "Kuliner": ["amenity:restaurant", "amenity:cafe", "amenity:fast_food", "amenity:food_court", "amenity:bar", "amenity:pub"],
  "Salon & Kecantikan": ["shop:hairdresser", "shop:beauty", "shop:cosmetics", "shop:massage"],
  "Otomotif": ["shop:car_repair", "shop:motorcycle", "shop:tyres", "shop:car", "shop:car_parts"],
  "Fashion": ["shop:clothes", "shop:shoes", "shop:fashion", "shop:boutique", "shop:bag"],
  "Kesehatan": ["amenity:clinic", "amenity:dentist", "amenity:doctors", "amenity:hospital"],
  "Apotek": ["amenity:pharmacy"],
  "Fotografi": ["shop:photo", "craft:photographer"],
  "Laundry": ["shop:laundry", "shop:dry_cleaning"],
  "Catering": ["shop:catering", "craft:caterer"],
  "Hotel & Penginapan": ["tourism:hotel", "tourism:guest_house", "tourism:hostel", "tourism:motel"],
  "Pendidikan": ["amenity:school", "amenity:college", "amenity:university", "amenity:language_school"],
  "Toko Elektronik": ["shop:electronics", "shop:computer", "shop:mobile_phone"],
  "Toko Material": ["shop:hardware", "shop:doityourself", "shop:building_materials", "shop:paint"],
  "Percetakan": ["shop:copyshop", "shop:printing"],
  "Furniture": ["shop:furniture", "shop:interior_decoration"],
  "Jasa Umum": ["shop:service", "shop:repair", "craft:electrician", "craft:plumber", "craft:carpenter", "craft:locksmith"],
  "Gym & Kebugaran": ["leisure:fitness_centre", "leisure:sports_centre"],
  "Pet Shop & Hewan": ["shop:pet", "shop:pet_grooming", "amenity:veterinary"],
  "Servis Elektronik": ["craft:electronics_repair", "shop:electronics_repair"],
};

// Photon returns osm_key/osm_value per feature. Filter locally instead of
// relying on osm_tag query params, which are too strict when combined with q.
const CATEGORY_TAG_SETS = new Map(
  Object.entries(CATEGORY_PHOTON_TAGS).map(([category, tags]) => [category, new Set(tags)]),
);

const router = Router();

const INDONESIAN_CITIES: Record<string, { lat: number; lon: number; radius: number }> = {
  "Jakarta": { lat: -6.2088, lon: 106.8456, radius: 15000 },
  "Bandung": { lat: -6.9175, lon: 107.6191, radius: 10000 },
  "Surabaya": { lat: -7.2575, lon: 112.7521, radius: 12000 },
  "Yogyakarta": { lat: -7.7956, lon: 110.3695, radius: 8000 },
  "Semarang": { lat: -6.9932, lon: 110.4203, radius: 10000 },
  "Medan": { lat: 3.5952, lon: 98.6722, radius: 12000 },
  "Denpasar": { lat: -8.6705, lon: 115.2126, radius: 8000 },
  "Makassar": { lat: -5.1477, lon: 119.4327, radius: 10000 },
  "Palembang": { lat: -2.9761, lon: 104.7754, radius: 10000 },
  "Bogor": { lat: -6.5971, lon: 106.8060, radius: 8000 },
  "Depok": { lat: -6.4025, lon: 106.7942, radius: 8000 },
  "Tangerang": { lat: -6.1781, lon: 106.6297, radius: 10000 },
  "Bekasi": { lat: -6.2349, lon: 106.9896, radius: 8000 },
  "Malang": { lat: -7.9666, lon: 112.6326, radius: 8000 },
  "Solo": { lat: -7.5755, lon: 110.8243, radius: 8000 },
  "Padang": { lat: -0.9471, lon: 100.4172, radius: 8000 },
  "Manado": { lat: 1.4748, lon: 124.8420, radius: 8000 },
  "Pontianak": { lat: -0.0263, lon: 109.3425, radius: 8000 },
  "Balikpapan": { lat: -1.2379, lon: 116.8529, radius: 8000 },
  "Pekanbaru": { lat: 0.5071, lon: 101.4478, radius: 8000 },
};

/**
 * Each category maps to one or more Overpass selectors. Multi-key alternation
 * (e.g. pharmacy by amenity OR chemist by shop) is expressed as separate
 * selectors — Overpass has no OR across different keys inside one selector.
 */
const CATEGORY_TAGS: Record<string, string[]> = {
  "Kuliner": [`["amenity"~"restaurant|cafe|fast_food|food_court|bar|ice_cream|bakery"]`],
  "Salon & Kecantikan": [`["shop"~"hairdresser|beauty|cosmetics|massage|nails|spa"]`],
  "Otomotif": [`["shop"~"car_repair|motorcycle|tyres|car|car_parts"]`],
  "Fashion": [`["shop"~"clothes|shoes|fashion|boutique|jewelry|bags|tailor"]`],
  "Kesehatan": [`["amenity"~"clinic|dentist|hospital|doctors|nursing_home"]`],
  "Apotek": [`["amenity"="pharmacy"]`, `["shop"~"chemist|drugstore"]`],
  "Fotografi": [`["shop"="photo"]`],
  "Laundry": [`["shop"~"laundry|dry_cleaning"]`],
  "Catering": [`["shop"~"catering"]`, `["craft"~"caterer"]`],
  "Hotel & Penginapan": [`["tourism"~"hotel|guest_house|hostel|motel|apartment"]`],
  "Pendidikan": [`["amenity"~"school|college|university|language_school|training|kindergarten"]`],
  "Toko Elektronik": [`["shop"~"electronics|computer|mobile_phone"]`],
  "Toko Material": [`["shop"~"hardware|doityourself|building_materials|paint|tiles"]`],
  "Percetakan": [`["shop"~"copyshop|print|digital_printing"]`],
  "Furniture": [`["shop"~"furniture|interior_decoration|curtain|kitchen"]`],
  "Jasa Umum": [`["craft"~"plumber|electrician|carpenter|handicraft|sawmill|stonemason"]`, `["shop"~"service|repair"]`],
  "Gym & Kebugaran": [`["leisure"~"fitness_centre|sports_centre"]`],
  "Pet Shop & Hewan": [`["shop"~"pet|pet_grooming"]`, `["amenity"="veterinary"]`],
  "Servis Elektronik": [`["craft"~"electronics_repair"]`, `["shop"~"electronics_repair"]`],
};

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface CachedElements {
  elements: OverpassElement[] | null;
  stale: boolean;
  dbAvailable: boolean;
}

interface PhotonFeature {
  properties?: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    website?: string;
    phone?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
}

interface ProspectSearchResult {
  name: string;
  phone: string;
  address: string | null;
  category: string;
  hasWebsite: boolean;
  website: string | null;
  mapsUrl: string | null;
  lat: number | null;
  lon: number | null;
  osm_id: number;
  placeId?: string | null;
  rating?: string | null;
  reviewCount?: string | null;
}

interface OutscraperPlace {
  name?: string;
  full_address?: string;
  phone?: string;
  site?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  type?: string;
  latitude?: number;
  longitude?: number;
  location_link?: string;
  place_id?: string;
  business_status?: string;
}

interface OutscraperResponse {
  id?: string;
  status?: string;
  data?: OutscraperPlace[][] | OutscraperPlace[];
  error?: string;
}

interface SerperPlace {
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  ratingCount?: number;
  type?: string;
  types?: string[];
  website?: string;
  phoneNumber?: string;
  cid?: string;
  placeId?: string;
}

interface SerperResponse {
  places?: SerperPlace[];
  credits?: number;
  message?: string;
}

function buildOverpassQuery(selectors: string[], lat: number, lon: number, radius: number): string {
  const union = selectors
    .map((tags) => `node${tags}(around:${radius},${lat},${lon});way${tags}(around:${radius},${lat},${lon});`)
    .join("");
  return `[out:json][timeout:30];(${union});out center 200;`;
}

/**
 * Canonical phone format = local `08…` form (same convention as Overpass data).
 * Accepts `08x`, `62x`, `+62x`, separators, spaces. Returns "" when unusable.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  let phone = raw.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  if (phone.startsWith("+62")) phone = "0" + phone.slice(3);
  if (phone.startsWith("62") && phone.length > 8) phone = "0" + phone.slice(2);
  return phone;
}

function extractPhone(tags: Record<string, string>): string {
  const raw = tags["phone"] || tags["contact:phone"] || tags["contact:mobile"] || tags["contact:whatsapp"] || "";
  return normalizePhone(raw);
}

const BooleanQuery = z.preprocess((value) => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}, z.boolean());

const SearchQuerySchema = z.object({
  city: z.string(),
  category: z.string(),
  onlyNoWebsite: BooleanQuery.optional().default(true),
});

async function readOverpassCache(cacheKey: string): Promise<CachedElements> {
  if (!isDatabaseConfigured || Date.now() < cacheDisabledUntil) {
    return { elements: null, stale: false, dbAvailable: false };
  }

  try {
    const [cached] = await db
      .select()
      .from(overpassCacheTable)
      .where(eq(overpassCacheTable.cacheKey, cacheKey));

    cacheDisabledUntil = 0;

    if (!cached) {
      return { elements: null, stale: false, dbAvailable: true };
    }

    const stale = Date.now() - cached.createdAt.getTime() >= OVERPASS_CACHE_TTL_MS;
    return {
      elements: cached.result as OverpassElement[],
      stale,
      dbAvailable: true,
    };
  } catch (err) {
    // A paused/deleted database must not break search. Just skip the cache.
    cacheDisabledUntil = Date.now() + CACHE_RETRY_AFTER_FAILURE_MS;
    logger.warn(
      { message: err instanceof Error ? err.message : String(err) },
      "Prospecting cache read failed; continuing without cache",
    );
    return { elements: null, stale: false, dbAvailable: false };
  }
}

async function writeOverpassCache(
  cacheKey: string,
  elements: OverpassElement[],
): Promise<void> {
  if (!isDatabaseConfigured || Date.now() < cacheDisabledUntil) return;

  try {
    await db
      .insert(overpassCacheTable)
      .values({ cacheKey, result: elements })
      .onConflictDoUpdate({
        target: overpassCacheTable.cacheKey,
        set: { result: elements, createdAt: new Date() },
      });

    cacheDisabledUntil = 0;
  } catch (err) {
    cacheDisabledUntil = Date.now() + CACHE_RETRY_AFTER_FAILURE_MS;
    logger.warn(
      { message: err instanceof Error ? err.message : String(err) },
      "Prospecting cache write failed; ignoring",
    );
  }
}

async function readProspectCache(
  cacheKey: string,
): Promise<{ results: ProspectSearchResult[] | null; stale: boolean; dbAvailable: boolean }> {
  if (!isDatabaseConfigured || Date.now() < cacheDisabledUntil) {
    return { results: null, stale: false, dbAvailable: false };
  }

  try {
    const [cached] = await db
      .select()
      .from(overpassCacheTable)
      .where(eq(overpassCacheTable.cacheKey, cacheKey));

    cacheDisabledUntil = 0;

    if (!cached) {
      return { results: null, stale: false, dbAvailable: true };
    }

    const stale = Date.now() - cached.createdAt.getTime() >= OVERPASS_CACHE_TTL_MS;
    return {
      results: cached.result as ProspectSearchResult[],
      stale,
      dbAvailable: true,
    };
  } catch (err) {
    cacheDisabledUntil = Date.now() + CACHE_RETRY_AFTER_FAILURE_MS;
    logger.warn(
      { message: err instanceof Error ? err.message : String(err) },
      "Prospecting cache read failed; continuing without cache",
    );
    return { results: null, stale: false, dbAvailable: false };
  }
}

async function writeProspectCache(
  cacheKey: string,
  results: ProspectSearchResult[],
): Promise<void> {
  if (!isDatabaseConfigured || Date.now() < cacheDisabledUntil) return;

  try {
    await db
      .insert(overpassCacheTable)
      .values({ cacheKey, result: results })
      .onConflictDoUpdate({
        target: overpassCacheTable.cacheKey,
        set: { result: results, createdAt: new Date() },
      });

    cacheDisabledUntil = 0;
  } catch (err) {
    cacheDisabledUntil = Date.now() + CACHE_RETRY_AFTER_FAILURE_MS;
    logger.warn(
      { message: err instanceof Error ? err.message : String(err) },
      "Prospecting cache write failed; ignoring",
    );
  }
}

/**
 * Count one billable Google Maps request. Only uncached searches reach this
 * point, so the counter matches the credits Serper actually spends.
 * Failures are logged and ignored: usage tracking must never break a search.
 */
async function recordProviderUsage(provider: string): Promise<void> {
  if (!isDatabaseConfigured) return;

  try {
    await db.execute(sql`
      INSERT INTO overpass_cache (cache_key, result)
      VALUES (${USAGE_KEY_PREFIX + provider}, ${JSON.stringify({ count: 1 })}::jsonb)
      ON CONFLICT (cache_key) DO UPDATE
      SET result = jsonb_build_object(
            'count',
            COALESCE((overpass_cache.result ->> 'count')::int, 0) + 1
          ),
          created_at = now()
    `);
  } catch (err) {
    logger.warn(
      { message: err instanceof Error ? err.message : String(err) },
      "Failed to record provider usage; ignoring",
    );
  }
}

/** Returns null when usage cannot be read (no database / DB error). */
async function readProviderUsage(provider: string): Promise<number | null> {
  if (!isDatabaseConfigured) return null;

  try {
    const [row] = await db
      .select()
      .from(overpassCacheTable)
      .where(eq(overpassCacheTable.cacheKey, USAGE_KEY_PREFIX + provider));

    if (!row) return 0;

    const count = Number((row.result as { count?: unknown } | null)?.count ?? 0);
    return Number.isFinite(count) ? count : 0;
  } catch (err) {
    logger.warn(
      { message: err instanceof Error ? err.message : String(err) },
      "Failed to read provider usage",
    );
    return null;
  }
}

function distanceMeters(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
): number {
  const dLat = (lat - centerLat) * 111_000;
  const dLon = (lon - centerLon) * 111_000 * Math.cos((centerLat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

function buildBoundingBox(cityCoords: { lat: number; lon: number; radius: number }): string {
  const latDelta = cityCoords.radius / 111_000;
  const lonDelta =
    cityCoords.radius / (111_000 * Math.cos((cityCoords.lat * Math.PI) / 180));

  return [
    cityCoords.lon - lonDelta,
    cityCoords.lat - latDelta,
    cityCoords.lon + lonDelta,
    cityCoords.lat + latDelta,
  ]
    .map((value) => value.toFixed(6))
    .join(",");
}

async function fetchPhotonQuery(
  query: string,
  cityCoords: { lat: number; lon: number; radius: number },
  bbox: string,
): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({
    q: query,
    bbox,
    lat: String(cityCoords.lat),
    lon: String(cityCoords.lon),
    limit: "50",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);

  try {
    const response = await fetch(`${PHOTON_ENDPOINT}?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "websensial-crm/1.0 (prospecting search)",
      },
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Photon returned ${response.status}: ${body.slice(0, 160)}`);
    }

    if (!(response.headers.get("content-type") ?? "").includes("json")) {
      throw new Error("Photon returned a non-JSON response");
    }

    const data = JSON.parse(body) as { features?: PhotonFeature[] };
    if (!Array.isArray(data.features)) {
      throw new Error("Photon returned an invalid payload");
    }

    return data.features;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPhoton(
  category: string,
  cityCoords: { lat: number; lon: number; radius: number },
): Promise<OverpassElement[]> {
  const bbox = buildBoundingBox(cityCoords);
  const allowedTags = CATEGORY_TAG_SETS.get(category) ?? new Set<string>();
  const maxDistance = cityCoords.radius * 1.25;
  const queries = Array.from(
    new Set([CATEGORY_KEYWORDS[category] ?? category, category, "toko"]),
  );
  const seen = new Set<number>();
  const results: OverpassElement[] = [];
  let lastError: unknown = null;

  for (const query of queries) {
    let features: PhotonFeature[];

    try {
      features = await fetchPhotonQuery(query, cityCoords, bbox);
      lastError = null;
    } catch (err) {
      lastError = err;
      logger.warn(
        { message: err instanceof Error ? err.message : String(err), query },
        "Photon query failed; trying next query",
      );
      continue;
    }

    for (const feature of features) {
      const props = feature.properties ?? {};
      const coordinates = feature.geometry?.coordinates;
      if (!props.name || !coordinates) continue;

      const [lon, lat] = coordinates;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (distanceMeters(lat, lon, cityCoords.lat, cityCoords.lon) > maxDistance) {
        continue;
      }

      const tag = `${props.osm_key ?? ""}:${props.osm_value ?? ""}`;
      if (allowedTags.size > 0 && !allowedTags.has(tag)) continue;

      const id = Number(props.osm_id ?? 0);
      if (seen.has(id)) continue;
      seen.add(id);

      const addressParts = [props.street, props.housenumber, props.city].filter(Boolean);

      results.push({
        id,
        type:
          props.osm_type === "W"
            ? "way"
            : props.osm_type === "R"
              ? "relation"
              : "node",
        lat,
        lon,
        tags: {
          name: props.name,
          phone: props.phone ?? "",
          website: props.website ?? "",
          "addr:street": props.street ?? "",
          "addr:housenumber": props.housenumber ?? "",
          "addr:city": props.city ?? "",
          "addr:full": addressParts.join(", "),
        },
      });
    }

    // A query with local matches is enough; no need to hit Photon again.
    if (results.length > 0) break;
  }

  if (results.length === 0 && lastError) {
    throw lastError;
  }

  return results;
}

async function fetchOverpass(query: string): Promise<OverpassElement[]> {
  const deadline = Date.now() + OVERPASS_TOTAL_BUDGET_MS;
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (Date.now() >= deadline) {
      lastError = new Error("Overpass search timed out");
      break;
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Math.min(OVERPASS_ATTEMPT_TIMEOUT_MS, deadline - Date.now()),
    );

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "websensial-crm/1.0 (prospecting search)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      const body = await response.text();

      if (!response.ok) {
        lastError = new Error(
          `Overpass ${new URL(endpoint).host} returned ${response.status}: ${body.slice(0, 160)}`,
        );
        logger.warn(lastError.message);
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        lastError = new Error(
          `Overpass ${new URL(endpoint).host} returned a non-JSON response`,
        );
        logger.warn(lastError.message);
        continue;
      }

      const data = JSON.parse(body) as { elements?: OverpassElement[] };
      return data.elements ?? [];
    } catch (err) {
      lastError =
        controller.signal.aborted
          ? new Error(`Overpass ${new URL(endpoint).host} timed out`)
          : err instanceof Error
            ? err
            : new Error("Overpass request failed");
      logger.warn(
        { message: lastError.message },
        "Overpass request failed; trying next mirror",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("All Overpass mirrors are unavailable");
}

async function fetchOutscraper(
  city: string,
  category: string,
): Promise<ProspectSearchResult[]> {
  const apiKey = process.env.OUTSCRAPER_API_KEY?.trim();
  if (!apiKey) throw new Error("OUTSCRAPER_API_KEY is not configured");

  const url = new URL(OUTSCRAPER_ENDPOINT);
  url.searchParams.set("query", `${category}, ${city}, Indonesia`);
  url.searchParams.set("limit", String(OUTSCRAPER_LIMIT));
  url.searchParams.set("async", "false");
  url.searchParams.set("language", "id");
  url.searchParams.set("region", "ID");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OUTSCRAPER_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "X-API-KEY": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Outscraper returned ${response.status}: ${body.slice(0, 160)}`);
    }

    const payload = JSON.parse(body) as OutscraperResponse;
    if (payload.status && payload.status !== "Success") {
      throw new Error(
        `Outscraper status ${payload.status}: ${payload.error ?? "no data"}`,
      );
    }

    const raw = Array.isArray(payload.data) ? payload.data : [];
    const places = raw.flat() as OutscraperPlace[];

    return places
      .filter(
        (place) =>
          place.name && place.business_status !== "CLOSED_PERMANENTLY",
      )
      .map((place) => {
        const lat = typeof place.latitude === "number" ? place.latitude : null;
        const lon = typeof place.longitude === "number" ? place.longitude : null;
        const website = place.site?.trim() || null;
        const rating =
          place.rating != null && Number.isFinite(Number(place.rating))
            ? Number(place.rating).toFixed(1)
            : null;

        return {
          name: place.name!,
          phone: normalizePhone(place.phone ?? ""),
          address: place.full_address ?? null,
          category: place.category || place.type || category,
          hasWebsite: website !== null,
          website,
          mapsUrl:
            place.location_link ??
            (lat !== null && lon !== null
              ? `https://maps.google.com/?q=${lat},${lon}`
              : null),
          lat,
          lon,
          osm_id: 0,
          placeId: place.place_id ?? null,
          rating,
          reviewCount: place.reviews != null ? String(place.reviews) : null,
        };
      });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("Outscraper request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSerper(
  city: string,
  category: string,
): Promise<ProspectSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) throw new Error("SERPER_API_KEY is not configured");

  const keyword = CATEGORY_KEYWORDS[category] ?? category;
  const query = `${keyword}, ${city}, Indonesia`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);

  try {
    const response = await fetch(SERPER_ENDPOINT, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ q: query, gl: "id", hl: "id" }),
      signal: controller.signal,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Serper returned ${response.status}: ${body.slice(0, 160)}`);
    }

    const payload = JSON.parse(body) as SerperResponse;
    const places = Array.isArray(payload.places) ? payload.places : [];

    return places
      .filter((place) => Boolean(place.title))
      .slice(0, SERPER_LIMIT)
      .map((place) => {
        const lat = Number.isFinite(Number(place.latitude))
          ? Number(place.latitude)
          : null;
        const lon = Number.isFinite(Number(place.longitude))
          ? Number(place.longitude)
          : null;
        const website = place.website?.trim() || null;
        const rating =
          place.rating != null && Number.isFinite(Number(place.rating))
            ? Number(place.rating).toFixed(1)
            : null;

        return {
          name: place.title!,
          phone: normalizePhone(place.phoneNumber ?? ""),
          address: place.address ?? null,
          category: place.type || category,
          hasWebsite: website !== null,
          website,
          mapsUrl: place.cid
            ? `https://maps.google.com/?cid=${place.cid}`
            : lat !== null && lon !== null
              ? `https://maps.google.com/?q=${lat},${lon}`
              : null,
          lat,
          lon,
          osm_id: 0,
          placeId: place.placeId ?? null,
          rating,
          reviewCount: place.ratingCount != null ? String(place.ratingCount) : null,
        };
      });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error("Serper request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/prospecting/cities", (_req, res) => {
  return res.json(Object.keys(INDONESIAN_CITIES));
});

router.get("/prospecting/categories", (_req, res) => {
  return res.json(Object.keys(CATEGORY_TAGS));
});

/**
 * Credit monitor for the Google Maps provider. `used` counts searches this
 * dashboard performed (cached results cost nothing); the authoritative balance
 * always lives in the Serper dashboard, so the UI links there too.
 */
router.get("/prospecting/quota", async (_req, res) => {
  const quotaFromEnv = Number(process.env.SERPER_CREDIT_QUOTA);
  const quota =
    Number.isFinite(quotaFromEnv) && quotaFromEnv > 0
      ? Math.floor(quotaFromEnv)
      : SERPER_FREE_CREDITS;

  const used = await readProviderUsage("serper");
  const remaining = used === null ? null : Math.max(0, quota - used);

  return res.json({
    provider: "serper",
    configured: Boolean(process.env.SERPER_API_KEY?.trim()),
    quota,
    used,
    remaining,
    fallbackProvider: process.env.OUTSCRAPER_API_KEY?.trim() ? "outscraper" : "osm",
  });
});

router.get("/prospecting/search", async (req, res) => {
  try {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

    const { city, category, onlyNoWebsite } = parsed.data;
    const cityCoords = INDONESIAN_CITIES[city];
    const categoryTags = CATEGORY_TAGS[category];

    if (!cityCoords) return res.status(400).json({ error: `City '${city}' not supported` });
    if (!categoryTags) return res.status(400).json({ error: `Category '${category}' not supported` });

    const filterByWebsite = (rows: ProspectSearchResult[]) =>
      rows.filter((row) => (onlyNoWebsite ? !row.hasWebsite : true));

    // Google Maps providers (name, rating, phone, website). Serper comes first
    // because its free allowance needs no card; Outscraper stays as a fallback
    // for accounts that already hold credits. OSM remains the free fallback.
    const mapsProviders: {
      name: "serper" | "outscraper";
      cacheKey: string;
      fetch: (city: string, category: string) => Promise<ProspectSearchResult[]>;
    }[] = [];

    if (process.env.SERPER_API_KEY?.trim()) {
      mapsProviders.push({
        name: "serper",
        cacheKey: `serper::${city}::${category}::${SERPER_LIMIT}`,
        fetch: fetchSerper,
      });
    }

    if (process.env.OUTSCRAPER_API_KEY?.trim()) {
      mapsProviders.push({
        name: "outscraper",
        cacheKey: `outscraper::${city}::${category}::${OUTSCRAPER_LIMIT}`,
        fetch: fetchOutscraper,
      });
    }

    for (const provider of mapsProviders) {
      const cachedProvider = await readProspectCache(provider.cacheKey);

      if (cachedProvider.results && !cachedProvider.stale) {
        const results = filterByWebsite(cachedProvider.results);
        return res.json({
          total: results.length,
          city,
          category,
          cached: true,
          source: provider.name,
          dbAvailable: cachedProvider.dbAvailable,
          results,
        });
      }

      try {
        const providerResults = await provider.fetch(city, category);
        if (providerResults.length > 0) {
          await writeProspectCache(provider.cacheKey, providerResults);
          await recordProviderUsage(provider.name);
          const results = filterByWebsite(providerResults);
          return res.json({
            total: results.length,
            city,
            category,
            cached: false,
            source: provider.name,
            dbAvailable: cachedProvider.dbAvailable,
            results,
          });
        }
        logger.warn(`${provider.name} returned no places; trying next source`);
      } catch (err) {
        logger.warn(
          { message: err instanceof Error ? err.message : String(err) },
          `${provider.name} search failed; trying next source`,
        );

        if (cachedProvider.results) {
          const results = filterByWebsite(cachedProvider.results);
          return res.json({
            total: results.length,
            city,
            category,
            cached: true,
            source: provider.name,
            dbAvailable: cachedProvider.dbAvailable,
            results,
          });
        }
      }
    }

    // Cache key cuma dari city+category (bukan onlyNoWebsite), karena itu cuma filter tampilan
    const cacheKey = `${city}::${category}`;
    const cached = await readOverpassCache(cacheKey);

    let elements: OverpassElement[] | null = cached.stale ? null : cached.elements;
    let source: "cache" | "photon" | "overpass" | "outscraper" = "cache";

    if (!elements || cached.stale) {
      elements = null;
      let lastError: unknown = null;
      let emptySource: "overpass" | "photon" | null = null;

      // 1) Overpass first: it exposes website/phone tags, which the
      //    "Hanya yang belum punya website" filter depends on.
      try {
        const query = buildOverpassQuery(
          categoryTags,
          cityCoords.lat,
          cityCoords.lon,
          cityCoords.radius,
        );

        const overpassResults = await fetchOverpass(query);
        if (overpassResults.length > 0) {
          elements = overpassResults;
          source = "overpass";
        } else {
          emptySource = "overpass";
        }
      } catch (err) {
        lastError = err;
        logger.warn(
          { message: err instanceof Error ? err.message : String(err) },
          "Overpass search failed; falling back to Photon",
        );
      }

      // 2) Photon fallback: same OSM data, much faster, but without contact
      //    tags. Search still works when Overpass is at capacity.
      if (!elements || elements.length === 0) {
        try {
          const photonResults = await fetchPhoton(category, cityCoords);
          if (photonResults.length > 0) {
            elements = photonResults;
            source = "photon";
          } else {
            emptySource = "photon";
          }
        } catch (err) {
          lastError = err;
          logger.error(
            { message: err instanceof Error ? err.message : String(err) },
            "Photon search failed",
          );
        }
      }

      // Both providers answered successfully, but there was genuinely no
      // matching business. Return an empty result instead of a scary error.
      if (!elements && emptySource) {
        elements = [];
        source = emptySource;
      }

      if (elements) {
        // Only cache Overpass data: it includes website/phone tags, while
        // Photon results would incorrectly mark websites as unknown.
        if (source === "overpass") {
          await writeOverpassCache(cacheKey, elements);
        }
      } else if (cached.elements) {
        // Kalau ada cache basi, lebih baik tampilkan data lama daripada gagal total.
        logger.warn("Search sources failed; serving stale cached results");
        elements = cached.elements;
        source = "cache";
      } else {
        const isTimeout =
          lastError instanceof Error && /timed out|abort/i.test(lastError.message);

        return res.status(isTimeout ? 504 : 502).json({
          error: isTimeout
            ? "Pencarian terlalu lama. Sumber data OpenStreetMap sedang lambat — coba lagi sebentar lagi."
            : "Sumber data OpenStreetMap sedang sibuk. Coba lagi sebentar lagi atau gunakan tab Import CSV.",
          detail: lastError instanceof Error ? lastError.message : undefined,
        });
      }
    }

    const results = (elements ?? [])
      .filter((el) => el.tags?.name)
      .map((el) => {
        const tags = el.tags!;
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const hasWebsite = !!(tags.website || tags["contact:website"] || tags.url);
        const phone = extractPhone(tags);
        const mapsUrl = lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : null;

        return {
          name: tags.name,
          phone,
          address:
            [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
              .filter(Boolean)
              .join(", ") ||
            tags["addr:full"] ||
            null,
          category,
          hasWebsite,
          website: tags.website || tags["contact:website"] || null,
          mapsUrl,
          lat: lat ?? null,
          lon: lon ?? null,
          osm_id: el.id,
          placeId: null,
          rating: null,
          reviewCount: null,
        };
      })
      .filter((r) => (onlyNoWebsite ? !r.hasWebsite : true));

    return res.json({
      total: results.length,
      city,
      category,
      cached: source === "cache",
      source,
      dbAvailable: cached.dbAvailable,
      results,
    });
  } catch (err: unknown) {
    logger.error(
      { message: err instanceof Error ? err.message : String(err) },
      "Prospecting search error",
    );
    return res.status(500).json({
      error: "Pencarian gagal karena kesalahan server.",
      detail: err instanceof Error ? err.message : undefined,
    });
  }
});

const BulkImportSchema = z.object({
  prospects: z.array(
    z.object({
      businessName: z.string(),
      phone: z.string().optional().default(""),
      address: z.string().optional(),
      category: z.string().optional().default("Umum"),
      hasWebsite: z.boolean().optional().default(false),
      mapsUrl: z.string().optional(),
      rating: z.string().optional(),
      reviewCount: z.string().optional(),
      ownerName: z.string().optional(),
      currentWebsite: z.string().optional(),
    })
  ),
});

/** Largest accepted payload per request — browser extensions can export a lot. */
const MAX_IMPORT_ROWS = 500;

/**
 * Column aliases for CSV header detection. Covers exports from G Maps Leads
 * Finder / Maps Business Finder style extensions (English + Indonesian labels)
 * and the manual sheet layout documented in the CRM UI.
 */
const CSV_ALIASES: Record<string, string[]> = {
  businessName: ["business name", "businessname", "name", "title", "company", "firm name", "nama bisnis", "nama"],
  phone: ["phone", "phone number", "phone_1", "phones", "primary phone", "no hp", "nomor hp", "no. hp", "telepon", "nomor telepon", "contact number", "contact", "whatsapp", "kontak"],
  website: ["website", "website url", "web site", "site", "domain", "situs web", "url website", "web"],
  mapsUrl: ["google maps", "google maps url", "google maps link", "maps url", "maps link", "link maps", "gmaps url", "google maps profile", "maps profile", "place url", "plus code url"],
  address: ["address", "address 1", "full address", "alamat", "alamat lengkap"],
  category: ["category", "category type", "type", "business type", "primary category", "kategori", "jenis"],
  rating: ["rating", "rating value", "stars", "bintang", "skor"],
  reviews: ["reviews", "review count", "reviews count", "number of reviews", "jumlah review", "total review", "ulasan"],
  ownerName: ["owner", "owner name", "business owner", "contact name", "pemilik", "nama pemilik"],
  plusCode: ["plus code", "plus_code", "open location code"],
  email: ["email", "e-mail", "contact email", "surel"],
};

interface ParsedProspect {
  businessName: string;
  phone: string;
  address: string | null;
  category: string;
  hasWebsite: boolean;
  mapsUrl: string | null;
  rating: string | null;
  reviewCount: string | null;
  ownerName: string | null;
  currentWebsite: string | null;
}

/** Schema stores rating as numeric(2,1); accept `4.5`, `4,5`, or "4". */
function parseRating(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = Number(raw.trim().replace(",", "."));
  if (Number.isNaN(value) || value < 0 || value > 5) return null;
  return value.toFixed(1);
}

/** Review counts arrive as "120", "1.2K", "1,205" — keep bare digits only. */
function parseReviewCount(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  return digits === "" ? null : String(Number(digits));
}

/**
 * Dedup key for websites: lowercase, no protocol, no `www.`, no trailing
 * slash — so `https://Example.com/` and `example.com` collide.
 */
function normalizeWebsiteKey(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").trim();
}

function willImportRecord(record: CsvRecord): ParsedProspect | null {
  const businessName = (record.businessName ?? "").trim();
  if (!businessName) return null;

  const phone = normalizePhone(record.phone ?? "");
  const mapsUrl = record.mapsUrl ? record.mapsUrl.trim() : null;
  const website = record.website ? record.website.trim() : "";
  const rating = parseRating(record.rating);
  const reviewCount = parseReviewCount(record.reviews);
  const ownerName = record.ownerName ? record.ownerName.trim() || null : null;
  const currentWebsite = website || null;

  return {
    businessName,
    phone,
    address: record.address ? record.address.trim() : null,
    category: record.category ? record.category.trim() : "Umum",
    hasWebsite: website !== "",
    mapsUrl: mapsUrl || null,
    rating,
    reviewCount,
    ownerName,
    currentWebsite,
  };
}

/**
 * Insert candidates into `prospects`, skipping duplicates.
 *
 * Dedup keys are the normalized phone number and the maps URL, both inside the
 * incoming batch and against rows already in the database — re-exporting the
 * same area from the browser extension must not create duplicate leads.
 */
async function insertProspects(candidates: ParsedProspect[]): Promise<{
  importedIds: number[];
  skippedInBatch: number;
  skippedExisting: number;
}> {
  const batchPhoneKeys = new Set<string>();
  const batchUrlKeys = new Set<string>();
  const batchWebsiteKeys = new Set<string>();

  const existingRows = await db
    .select({
      phone: prospectsTable.phone,
      mapsUrl: prospectsTable.mapsUrl,
      currentWebsite: prospectsTable.currentWebsite,
    })
    .from(prospectsTable);

  const existingPhoneKeys = new Set(
    existingRows.map((row) => normalizePhone(row.phone ?? "")).filter((phone) => phone && phone !== "-"),
  );
  const existingUrlKeys = new Set(
    existingRows.map((row) => row.mapsUrl?.trim().toLowerCase()).filter((url): url is string => !!url),
  );
  const existingWebsiteKeys = new Set(
    existingRows
      .map((row) => (row.currentWebsite ? normalizeWebsiteKey(row.currentWebsite) : null))
      .filter((site): site is string => !!site),
  );

  const values: {
    businessName: string;
    phone: string;
    address: string | null;
    category: string;
    source: "gmaps";
    hasWebsite: boolean;
    status: "belum_dihubungi";
    mapsUrl: string | null;
    rating: string | null;
    ownerName: string | null;
    currentWebsite: string | null;
    notes: string | null;
  }[] = [];

  let skippedInBatch = 0;
  let skippedExisting = 0;

  for (const candidate of candidates) {
    const phoneKey = candidate.phone !== "" ? candidate.phone : null;
    const urlKey = candidate.mapsUrl ? candidate.mapsUrl.toLowerCase() : null;
    const websiteKey = candidate.currentWebsite ? normalizeWebsiteKey(candidate.currentWebsite) : null;

    // Both keys empty → nothing to dedupe on, always import.
    const dedupable = phoneKey !== null || urlKey !== null || websiteKey !== null;

    if (dedupable) {
      if (phoneKey !== null && (existingPhoneKeys.has(phoneKey) || batchPhoneKeys.has(phoneKey))) {
        skippedExisting += batchPhoneKeys.has(phoneKey) ? 0 : 1;
        skippedInBatch += batchPhoneKeys.has(phoneKey) ? 1 : 0;
        continue;
      }
      if (urlKey !== null && (existingUrlKeys.has(urlKey) || batchUrlKeys.has(urlKey))) {
        skippedExisting += batchUrlKeys.has(urlKey) ? 0 : 1;
        skippedInBatch += batchUrlKeys.has(urlKey) ? 1 : 0;
        continue;
      }
      if (websiteKey !== null && (existingWebsiteKeys.has(websiteKey) || batchWebsiteKeys.has(websiteKey))) {
        skippedExisting += batchWebsiteKeys.has(websiteKey) ? 0 : 1;
        skippedInBatch += batchWebsiteKeys.has(websiteKey) ? 1 : 0;
        continue;
      }
    }

    if (phoneKey !== null) batchPhoneKeys.add(phoneKey);
    if (urlKey !== null) batchUrlKeys.add(urlKey);
    if (websiteKey !== null) batchWebsiteKeys.add(websiteKey);

    values.push({
      businessName: candidate.businessName,
      phone: candidate.phone || "-",
      address: candidate.address,
      category: candidate.category,
      source: "gmaps",
      hasWebsite: candidate.hasWebsite,
      status: "belum_dihubungi",
      mapsUrl: candidate.mapsUrl,
      rating: candidate.rating,
      ownerName: candidate.ownerName,
      currentWebsite: candidate.currentWebsite,
      notes: candidate.reviewCount ? `${candidate.reviewCount} ulasan` : null,
    });
  }

  if (values.length === 0) {
    return { importedIds: [], skippedInBatch, skippedExisting };
  }

  const inserted = await db.insert(prospectsTable).values(values).returning({ id: prospectsTable.id });
  return { importedIds: inserted.map((row) => row.id), skippedInBatch, skippedExisting };
}

router.post("/prospecting/bulk-import", async (req, res) => {
  try {
    if (!isDatabaseConfigured) {
      return res.status(503).json({
        error:
          "Database belum terhubung. Set DATABASE_URL di .env.local lalu jalankan ulang server.",
      });
    }

    //--------- Input: either the existing JSON contract, or raw CSV ---------
    // CSV can arrive as Content-Type: text/csv (raw string body, parsed by
    // express.text) or as { csv: "..." } inside a JSON envelope. Header-style
    // exports from browser extensions are auto-mapped; headerless CSV falls
    // back to the positional layout documented in the CRM UI.
    const contentType = String(req.headers["content-type"] ?? "");
    const csvText =
      contentType.includes("text/csv")
        ? (typeof req.body === "string" ? req.body : "")
        : typeof req.body?.csv === "string"
          ? req.body.csv
          : "";

    let candidates: ParsedProspect[];
    let truncated = false;

    if (csvText.trim() !== "") {
      const records = csvToRecords(csvText, CSV_ALIASES);
      const parsedRows = records.map(willImportRecord);
      const invalid = parsedRows.filter((row) => row === null).length;
      candidates = parsedRows.filter((row): row is ParsedProspect => row !== null);

      if (candidates.length > MAX_IMPORT_ROWS) {
        truncated = true;
        candidates = candidates.slice(0, MAX_IMPORT_ROWS);
      }

      const insertResult = await insertProspects(candidates);
      return res.status(201).json({
        imported: insertResult.importedIds.length,
        ids: insertResult.importedIds,
        skippedDuplicatesInBatch: insertResult.skippedInBatch + insertResult.skippedExisting,
        skippedExisting: insertResult.skippedExisting,
        invalidRows: invalid,
        truncated,
      });
    }

    const parsed = BulkImportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    candidates = parsed.data.prospects.map((p) => ({
      businessName: p.businessName.trim(),
      phone: normalizePhone(p.phone),
      address: p.address ?? null,
      category: p.category || "Umum",
      hasWebsite: p.hasWebsite,
      mapsUrl: p.mapsUrl ?? null,
      rating: parseRating(p.rating),
      reviewCount: p.reviewCount?.trim() || null,
      ownerName: p.ownerName?.trim() || null,
      currentWebsite: p.currentWebsite?.trim() || null,
    }));

    if (candidates.length > MAX_IMPORT_ROWS) {
      truncated = true;
      candidates = candidates.slice(0, MAX_IMPORT_ROWS);
    }

    const insertResult = await insertProspects(candidates);
    return res.status(201).json({
      imported: insertResult.importedIds.length,
      ids: insertResult.importedIds,
      skippedDuplicatesInBatch: insertResult.skippedInBatch + insertResult.skippedExisting,
      skippedExisting: insertResult.skippedExisting,
      truncated,
    });
  } catch (err) {
    logger.error({ err }, "Bulk import error");
    return res.status(500).json({
      error: "Import gagal. Pastikan database sudah terhubung dan tabel sudah dibuat.",
      detail: err instanceof Error ? err.message : undefined,
    });
  }
});

export default router;
