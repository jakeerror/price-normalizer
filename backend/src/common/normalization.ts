/** Normalization helpers: chaos → structure (SPEC §5.4). Pure, unit-tested. */

const UNIT_MAP: Record<string, string> = {
  шт: "pcs",
  "шт.": "pcs",
  штук: "pcs",
  pcs: "pcs",
  pc: "pcs",
  кг: "kg",
  kg: "kg",
  г: "g",
  гр: "g",
  g: "g",
  уп: "pack",
  упак: "pack",
  "уп.": "pack",
  pack: "pack",
  м: "m",
  m: "m",
  "м2": "m2",
  "м²": "m2",
  л: "l",
  l: "l",
  т: "t",
  t: "t",
};

const CURRENCY_MAP: Record<string, string> = {
  "₽": "RUB",
  руб: "RUB",
  "руб.": "RUB",
  rub: "RUB",
  р: "RUB",
  $: "USD",
  usd: "USD",
  "€": "EUR",
  eur: "EUR",
};

/** Lower-case, strip punctuation, collapse whitespace. */
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Parse messy money/quantity strings to a number:
 * "1 234,56" | "1,234.56" | "1234.56" | "1 234.56" → 1234.56
 * Returns null if no digits are present.
 */
export function normalizeNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s]/g, "").replace(/[^\d.,-]/g, "");
  if (!/\d/.test(cleaned)) return null;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;

  if (hasComma && hasDot) {
    // The right-most separator is the decimal one; the other groups thousands.
    const decimalSep = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    normalized = cleaned.split(thousandSep).join("");
    normalized = normalized.replace(decimalSep, ".");
  } else if (hasComma) {
    // Only comma → treat as decimal separator.
    normalized = cleaned.replace(",", ".");
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function normalizeUnit(raw: string): string {
  const key = raw.trim().toLowerCase();
  return UNIT_MAP[key] ?? (key || "pcs");
}

export function normalizeCurrency(raw: string | null | undefined): string {
  if (!raw) return "RUB";
  const key = raw.trim().toLowerCase();
  return CURRENCY_MAP[key] ?? (key.length === 3 ? key.toUpperCase() : "RUB");
}

/** Normalize an article/SKU for exact comparison. */
export function normalizeArticle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, "");
  return cleaned.length > 0 ? cleaned : null;
}
