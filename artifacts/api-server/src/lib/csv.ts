/**
 * Minimal RFC4180-style CSV parser — no external dependency.
 *
 * Handles: quoted fields, `""` escapes, commas/newlines inside quotes,
 * `\r\n` and `\n` line endings, a trailing BOM, and blank lines (skipped).
 */
export function parseCsv(input: string): string[][] {
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
    // Fully blank lines (e.g. trailing newline or separators between rows) are skipped.
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

function normHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export type CsvRecord = Record<string, string | null>;

/**
 * Parse CSV into records.
 *
 * If the first row looks like a header (its cells match the known aliases),
 * columns are mapped by their header names — needed for exports from browser
 * extensions like "G Maps Leads Finder" whose column order may vary. Otherwise
 * the documented positional layout is used: name, phone, address, category, mapsUrl.
 */
export function csvToRecords(input: string, aliasByField: Record<string, string[]>): CsvRecord[] {
  const rows = parseCsv(input);
  if (rows.length === 0) return [];

  const aliasesNorm = new Set(Object.values(aliasByField).flat().map(normHeader));
  const hasHeader =
    rows[0].map(normHeader).filter((cell) => cell !== "" && aliasesNorm.has(cell)).length >= 2;

  const rowsToRead = hasHeader ? rows.slice(1) : rows;
  const positionalFields = ["businessName", "phone", "address", "category", "mapsUrl"];
  const columns: { field: string; col: number }[] = [];

  if (hasHeader) {
    const headers = rows[0].map(normHeader);
    headers.forEach((header, col) => {
      for (const [field, aliases] of Object.entries(aliasByField)) {
        if (aliases.some((alias) => normHeader(alias) === header)) {
          columns.push({ field, col });
          break;
        }
      }
    });
  } else {
    positionalFields.forEach((field, col) => columns.push({ field, col }));
  }

  return rowsToRead.map((row) => {
    const record: CsvRecord = {};
    for (const { field, col } of columns) {
      record[field] = row[col] === "" || row[col] == null ? null : row[col];
    }
    return record;
  });
}
