import {
  normalizeArticle,
  normalizeCurrency,
  normalizeName,
  normalizeNumber,
  normalizeUnit,
} from "./normalization";

describe("normalizeNumber", () => {
  it.each([
    ["1234.56", 1234.56],
    ["1 234,56", 1234.56],
    ["1,234.56", 1234.56],
    ["1 234.56", 1234.56],
    ["450,50", 450.5],
    ["1000", 1000],
    ["99,90 ₽", 99.9],
  ])("parses %s -> %s", (input, expected) => {
    expect(normalizeNumber(input)).toBeCloseTo(expected, 2);
  });

  it.each(["", "  ", "abc", "—"])("returns null for %s", (input) => {
    expect(normalizeNumber(input)).toBeNull();
  });
});

describe("normalizeUnit", () => {
  it.each([
    ["шт", "pcs"],
    ["шт.", "pcs"],
    ["кг", "kg"],
    ["уп", "pack"],
    ["м²", "m2"],
  ])("maps %s -> %s", (input, expected) => {
    expect(normalizeUnit(input)).toBe(expected);
  });

  it("passes through unknown units lower-cased", () => {
    expect(normalizeUnit("Ящик")).toBe("ящик");
  });
});

describe("normalizeCurrency", () => {
  it.each([
    ["₽", "RUB"],
    ["руб", "RUB"],
    ["$", "USD"],
    ["€", "EUR"],
  ])("maps %s -> %s", (input, expected) => {
    expect(normalizeCurrency(input)).toBe(expected);
  });

  it("defaults to RUB when empty", () => {
    expect(normalizeCurrency(null)).toBe("RUB");
    expect(normalizeCurrency("")).toBe("RUB");
  });
});

describe("normalizeName / normalizeArticle", () => {
  it("lower-cases, strips punctuation, collapses whitespace", () => {
    expect(normalizeName("  Цемент   М-500 (мешок)! ")).toBe("цемент м 500 мешок");
  });

  it("normalizes articles and returns null for empty", () => {
    expect(normalizeArticle("  CEM-500 ")).toBe("cem-500");
    expect(normalizeArticle(null)).toBeNull();
    expect(normalizeArticle("   ")).toBeNull();
  });
});
