import { Router } from "express";
import { db, prospectsTable, overpassCacheTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { csvToRecords, type CsvRecord } from "../lib/csv";

const OVERPASS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam — data bisnis lokal jarang berubah harian

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
};

const CATEGORY_TAGS: Record<string, string> = {
  "Kuliner": `["amenity"~"restaurant|cafe|fast_food|food_court|bar"]`,
  "Salon & Kecantikan": `["shop"~"hairdresser|beauty|cosmetics|massage"]`,
  "Otomotif": `["shop"~"car_repair|motorcycle|tyres|car"]`,
  "Fashion": `["shop"~"clothes|shoes|fashion|boutique"]`,
  "Kesehatan": `["amenity"~"clinic|dentist|pharmacy|hospital"]["healthcare"]`,
  "Apotek": `["amenity"="pharmacy"]`,
  "Fotografi": `["shop"="photo"]`,
  "Laundry": `["shop"="laundry"]`,
  "Catering": `["shop"~"catering|food"]`,
  "Hotel & Penginapan": `["tourism"~"hotel|guest_house|hostel|motel"]`,
  "Pendidikan": `["amenity"~"school|college|university|language_school"]`,
  "Toko Elektronik": `["shop"="electronics"]`,
  "Toko Material": `["shop"~"hardware|doityourself|building_materials"]`,
  "Percetakan": `["shop"="copyshop"]`,
  "Furniture": `["shop"~"furniture|interior_decoration"]`,
  "Jasa Umum": `["shop"~"service|repair"]["craft"]`,
};

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildOverpassQuery(tags: string, lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:25];(node${tags}(around:${radius},${lat},${lon});way${tags}(around:${radius},${lat},${lon}););out center 50;`;
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
  const raw = tags["phone"] || tags["contact:phone"] || tags["contact:mobile"] || "";
  return normalizePhone(raw);
}

const SearchQuerySchema = z.object({
  city: z.string(),
  category: z.string(),
  onlyNoWebsite: z.coerce.boolean().optional().default(true),
});

router.get("/prospecting/cities", (_req, res) => {
  return res.json(Object.keys(INDONESIAN_CITIES));
});

router.get("/prospecting/categories", (_req, res) => {
  return res.json(Object.keys(CATEGORY_TAGS));
});

router.get("/prospecting/search", async (req, res) => {
  try {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

    const { city, category, onlyNoWebsite } = parsed.data;
    const cityCoords = INDONESIAN_CITIES[city];
    const categoryTag = CATEGORY_TAGS[category];

    if (!cityCoords) return res.status(400).json({ error: `City '${city}' not supported` });
    if (!categoryTag) return res.status(400).json({ error: `Category '${category}' not supported` });

    // Cache key cuma dari city+category (bukan onlyNoWebsite), karena itu cuma filter tampilan
    const cacheKey = `${city}::${category}`;
    let elements: OverpassElement[];

    const [cached] = await db
      .select()
      .from(overpassCacheTable)
      .where(eq(overpassCacheTable.cacheKey, cacheKey));

    const isCacheFresh = cached && Date.now() - cached.createdAt.getTime() < OVERPASS_CACHE_TTL_MS;

    if (isCacheFresh) {
      elements = cached.result as OverpassElement[];
    } else {
      const query = buildOverpassQuery(categoryTag, cityCoords.lat, cityCoords.lon, cityCoords.radius);
      const url = `https://overpass-api.de/api/interpreter`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      let overpassRes: Response;
      try {
        overpassRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!overpassRes.ok) {
        // Overpass lagi error/rate-limit — kalau ada cache lama (walau basi), lebih baik pakai itu daripada gagal total
        if (cached) {
          elements = cached.result as OverpassElement[];
        } else {
          return res.status(502).json({ error: "Overpass API error", status: overpassRes.status });
        }
      } else {
        const data = (await overpassRes.json()) as { elements: OverpassElement[] };
        elements = data.elements ?? [];

        await db
          .insert(overpassCacheTable)
          .values({ cacheKey, result: elements })
          .onConflictDoUpdate({
            target: overpassCacheTable.cacheKey,
            set: { result: elements, createdAt: new Date() },
          });
      }
    }

    const results = elements
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
          address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
            .filter(Boolean)
            .join(", ") || tags["addr:full"] || null,
          category,
          hasWebsite,
          website: tags.website || tags["contact:website"] || null,
          mapsUrl,
          lat,
          lon,
          osm_id: el.id,
        };
      })
      .filter((r) => (onlyNoWebsite ? !r.hasWebsite : true));

    return res.json({
      total: results.length,
      city,
      category,
      results,
    });
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "AbortError") {
      return res.status(504).json({ error: "Overpass API timeout. Try a smaller city or different category." });
    }
    req.log.error({ err }, "Prospecting search error");
    return res.status(500).json({ error: "Search failed" });
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
  businessName: ["business name", "businessname", "name", "title", "company", "nama bisnis", "nama"],
  phone: ["phone", "phone number", "phone_1", "phones", "no hp", "nomor hp", "no. hp", "telepon", "nomor telepon", "contact number", "kontak"],
  website: ["website", "website url", "web site", "situs web", "url website", "web"],
  mapsUrl: ["google maps", "google maps url", "google maps link", "maps url", "maps link", "link maps", "gmaps url", "google maps profile", "plus code url"],
  address: ["address", "alamat", "alamat lengkap"],
  category: ["category", "category type", "type", "kategori", "jenis"],
  rating: ["rating", "skor"],
};

interface ParsedProspect {
  businessName: string;
  phone: string;
  address: string | null;
  category: string;
  hasWebsite: boolean;
  mapsUrl: string | null;
}

function willImportRecord(record: CsvRecord): ParsedProspect | null {
  const businessName = (record.businessName ?? "").trim();
  if (!businessName) return null;

  const phone = normalizePhone(record.phone ?? "");
  const mapsUrl = record.mapsUrl ? record.mapsUrl.trim() : null;
  const website = record.website ? record.website.trim() : "";

  return {
    businessName,
    phone,
    address: record.address ? record.address.trim() : null,
    category: record.category ? record.category.trim() : "Umum",
    hasWebsite: website !== "",
    mapsUrl: mapsUrl || null,
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

  const existingRows = await db
    .select({ phone: prospectsTable.phone, mapsUrl: prospectsTable.mapsUrl })
    .from(prospectsTable);

  const existingPhoneKeys = new Set(
    existingRows.map((row) => normalizePhone(row.phone ?? "")).filter((phone) => phone && phone !== "-"),
  );
  const existingUrlKeys = new Set(
    existingRows.map((row) => row.mapsUrl?.trim().toLowerCase()).filter((url): url is string => !!url),
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
  }[] = [];

  let skippedInBatch = 0;
  let skippedExisting = 0;

  for (const candidate of candidates) {
    const phoneKey = candidate.phone !== "" ? candidate.phone : null;
    const urlKey = candidate.mapsUrl ? candidate.mapsUrl.toLowerCase() : null;

    // Both keys empty → nothing to dedupe on, always import.
    const dedupable = phoneKey !== null || urlKey !== null;

    if (dedupable) {
      if (phoneKey !== null && (existingPhoneKeys.has(phoneKey) || batchPhoneKeys.has(phoneKey))) {
        skippedInBatch += batchPhoneKeys.has(phoneKey) ? 1 : 0;
        skippedExisting += batchPhoneKeys.has(phoneKey) ? 0 : 1;
        continue;
      }
      if (urlKey !== null && (existingUrlKeys.has(urlKey) || batchUrlKeys.has(urlKey))) {
        skippedInBatch += batchUrlKeys.has(urlKey) ? 1 : 0;
        skippedExisting += batchUrlKeys.has(urlKey) ? 0 : 1;
        continue;
      }
    }

    if (phoneKey !== null) batchPhoneKeys.add(phoneKey);
    if (urlKey !== null) batchUrlKeys.add(urlKey);

    values.push({
      businessName: candidate.businessName,
      phone: candidate.phone || "-",
      address: candidate.address,
      category: candidate.category,
      source: "gmaps",
      hasWebsite: candidate.hasWebsite,
      status: "belum_dihubungi",
      mapsUrl: candidate.mapsUrl,
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
    req.log.error({ err }, "Bulk import error");
    return res.status(500).json({ error: "Import failed" });
  }
});

export default router;
