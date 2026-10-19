/**
 * Minimal RFC4180-style CSV parser + column auto-mapping for prospect imports.
 *
 * Accepts raw pastes from browser extensions (G Maps Leads Finder, Maps
 * Business Finder) whose header names vary, plus the manual sheet layout
 * documented in the CRM UI (no header, positional: name, phone, address,
 * category, mapsUrl).
 */

import { normalizePhone } from "./phone";

// Re-exported so existing `@/lib/csv` imports keep working.
export { normalizePhone };

const ALIASES: Record<string, string[]> = {
  businessName: ["business name", "businessname", "name", "title", "company", "firm name", "nama bisnis", "nama"],
  phone: [
    "phone",
    "phone number",
    "phone_1",
    "phones",
    "primary phone",
    "no hp",
    "nomor hp",
    "no. hp",
    "telepon",
    "nomor telepon",
    "contact number",
    "contact",
    "whatsapp",
    "kontak",
  ],
  website: ["website", "website url", "web site", "site", "domain", "situs web", "url website", "web"],
  mapsUrl: [
    "google maps",
    "google maps url",
    "google maps link",
    "maps url",
    "maps link",
    "link maps",
    "gmaps url",
    "google maps profile",
    "maps profile",
    "place url",
    "plus code url",
  ],
  address: ["address", "address 1", "full address", "alamat", "alamat lengkap"],
  category: ["category", "category type", "type", "business type", "primary category", "kategori", "jenis"],
  rating: ["rating", "rating value", "stars", "bintang", "skor"],
  reviews: [
    "reviews",
    "review count",
    "reviews count",
    "number of reviews",
    "jumlah review",
    "total review",
    "ulasan",
  ],
  ownerName: ["owner", "owner name", "business owner", "contact name", "pemilik", "nama pemilik"],
  plusCode: ["plus code", "plus_code", "open location code"],
  email: ["email", "e-mail", "contact email", "surel"],
};

export interface ParsedBusiness {
  name: string;
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

function normHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function parseRows(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const endField = () => {
    row.push(field.trim());
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\n") {
      endRow();
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

export function parseBusinessCsv(text: string): ParsedBusiness[] {
  const rows = parseRows(text);
  if (rows.length === 0) return [];

  const aliasesNorm = new Set(Object.values(ALIASES).flat().map(normHeader));
  const hasHeader = rows[0].map(normHeader).filter((cell) => cell !== "" && aliasesNorm.has(cell)).length >= 2;

  const columns: { field: string; col: number }[] = [];
  const dataRows = hasHeader ? rows.slice(1) : rows;

  if (hasHeader) {
    const headers = rows[0].map(normHeader);
    headers.forEach((header, col) => {
      for (const [field, aliases] of Object.entries(ALIASES)) {
        if (aliases.some((alias) => normHeader(alias) === header)) {
          columns.push({ field, col });
          break;
        }
      }
    });
  } else {
    (["businessName", "phone", "address", "category", "mapsUrl"] as const).forEach((field, col) =>
      columns.push({ field, col }),
    );
  }

  const results: ParsedBusiness[] = [];
  for (const row of dataRows) {
    const record: Record<string, string | null> = {};
    for (const { field, col } of columns) {
      record[field] = row[col] === "" || row[col] == null ? null : row[col];
    }

    const name = (record.businessName ?? "").trim();
    if (!name) continue;

    const website = (record.website ?? "").trim();
    const ratingRaw = (record.rating ?? "").trim();
    const ratingValue = ratingRaw ? Number(ratingRaw.replace(",", ".")) : null;
    const rating = ratingValue != null && !Number.isNaN(ratingValue) && ratingValue >= 0 && ratingValue <= 5
      ? ratingValue.toFixed(1)
      : null;
    const reviewDigits = (record.reviews ?? "").replace(/[^\d]/g, "");
    const ownerName = (record.ownerName ?? "").trim() || null;

    results.push({
      name,
      phone: normalizePhone(record.phone ?? ""),
      address: record.address ? record.address.trim() : null,
      category: record.category ? record.category.trim() : "Umum",
      hasWebsite: website !== "",
      mapsUrl: record.mapsUrl ? record.mapsUrl.trim() : null,
      rating,
      reviewCount: reviewDigits ? String(Number(reviewDigits)) : null,
      ownerName,
      currentWebsite: website || null,
    });
  }
  return results;
}
