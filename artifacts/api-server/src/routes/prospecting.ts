import { Router } from "express";
import { db, prospectsTable } from "@workspace/db";
import { z } from "zod";

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

function extractPhone(tags: Record<string, string>): string {
  const raw = tags["phone"] || tags["contact:phone"] || tags["contact:mobile"] || "";
  if (!raw) return "";
  let phone = raw.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  if (phone.startsWith("+62")) phone = "0" + phone.slice(3);
  if (phone.startsWith("62")) phone = "0" + phone.slice(2);
  return phone;
}

const SearchQuerySchema = z.object({
  city: z.string(),
  category: z.string(),
  onlyNoWebsite: z.coerce.boolean().optional().default(true),
});

router.get("/prospecting/cities", (_req, res) => {
  res.json(Object.keys(INDONESIAN_CITIES));
});

router.get("/prospecting/categories", (_req, res) => {
  res.json(Object.keys(CATEGORY_TAGS));
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
      return res.status(502).json({ error: "Overpass API error", status: overpassRes.status });
    }

    const data = await overpassRes.json() as { elements: OverpassElement[] };
    const elements = data.elements ?? [];

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

    res.json({
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
    res.status(500).json({ error: "Search failed" });
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

router.post("/prospecting/bulk-import", async (req, res) => {
  try {
    const parsed = BulkImportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const values = parsed.data.prospects.map((p) => ({
      businessName: p.businessName,
      phone: p.phone || "-",
      address: p.address ?? null,
      category: p.category,
      source: "gmaps" as const,
      hasWebsite: p.hasWebsite,
      status: "belum_dihubungi" as const,
      mapsUrl: p.mapsUrl ?? null,
    }));

    const inserted = await db.insert(prospectsTable).values(values).returning({ id: prospectsTable.id });

    res.status(201).json({ imported: inserted.length, ids: inserted.map((r) => r.id) });
  } catch (err) {
    req.log.error({ err }, "Bulk import error");
    res.status(500).json({ error: "Import failed" });
  }
});

export default router;
