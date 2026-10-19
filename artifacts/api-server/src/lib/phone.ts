/**
 * Nomor telepon Indonesia.
 *
 * Format kanonik penyimpanan = lokal `08…` (sama dengan data Overpass).
 * `toWaNumber` menghasilkan digit internasional tanpa `+` untuk tautan
 * `https://wa.me/<nomor>`, dan `formatPhoneDisplay` menghasilkan tampilan
 * `+62 812-3456-7890` supaya nomor hasil scrape langsung siap dipakai.
 */

/** `08x`, `62x`, `+62x`, `8x`, dengan spasi/titik/strip → `08…`. */
export function normalizePhone(raw: string): string {
  if (!raw) return "";

  let phone = raw.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  if (phone.startsWith("+62")) phone = "0" + phone.slice(3);
  if (phone.startsWith("62") && phone.length > 8) phone = "0" + phone.slice(2);
  // Google Maps kadang mengembalikan nomor tanpa awalan 0/62 ("812…").
  if (phone.startsWith("8") && phone.length >= 9) phone = "0" + phone;
  return phone;
}

/**
 * Digit untuk `wa.me` (tanpa `+`): `0…`/`8…`/`62…` → `62…`.
 * Mengembalikan "" kalau nomornya tidak masuk akal sebagai nomor Indonesia.
 */
export function toWaNumber(raw: string): string {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0")) digits = "62" + digits.replace(/^0+/, "");
  else if (digits.startsWith("8")) digits = "62" + digits;
  else if (!digits.startsWith("62")) return "";

  // 62 + 8..13 digit: cukup panjang untuk nomor Indonesia, tidak terlalu panjang.
  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}

/** Tampilan internasional siap kirim: `+62 812-3456-7890`. */
export function formatPhoneDisplay(raw: string): string {
  const waNumber = toWaNumber(raw);
  if (!waNumber) return (raw ?? "").trim();

  const rest = waNumber.slice(2);

  // Seluler: 8xx-xxxx-xxxx
  if (rest.startsWith("8")) {
    const a = rest.slice(0, 3);
    const b = rest.slice(3, 7);
    const c = rest.slice(7);
    return `+62 ${a}${b ? `-${b}` : ""}${c ? `-${c}` : ""}`;
  }

  // Telepon rumah (area code 2–4 digit): tampilkan apa adanya setelah +62.
  return `+62 ${rest}`;
}
