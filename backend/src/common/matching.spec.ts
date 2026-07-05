import { MatchMethod, MatchStatus } from "./enums";
import { CatalogItem, matchOffer } from "./matching";

const thresholds = { high: 0.9, low: 0.6 };

const catalog: CatalogItem[] = [
  { id: 1, article: "CEM500", normalizedName: "цемент м500", name: "Цемент М500" },
  { id: 2, article: "ARM12", normalizedName: "арматура а500с 12мм", name: "Арматура 12" },
];

describe("matchOffer", () => {
  it("matches exactly by article (confidence 1.0)", () => {
    const r = matchOffer("что угодно", "cem500", catalog, thresholds);
    expect(r.method).toBe(MatchMethod.Article);
    expect(r.status).toBe(MatchStatus.AutoMatched);
    expect(r.canonicalProductId).toBe(1);
    expect(r.confidence).toBe(1);
  });

  it("auto-matches by fuzzy name above the high threshold", () => {
    const r = matchOffer("цемент м500", null, catalog, thresholds);
    expect(r.method).toBe(MatchMethod.Fuzzy);
    expect(r.status).toBe(MatchStatus.AutoMatched);
    expect(r.canonicalProductId).toBe(1);
  });

  it("sends mid-confidence matches to review with candidates", () => {
    // Wide review band so a close-but-not-identical name lands in review.
    const r = matchOffer("цемент марка м500", null, catalog, {
      high: 0.99,
      low: 0.1,
    });
    expect(r.status).toBe(MatchStatus.NeedsReview);
    expect(r.canonicalProductId).toBeNull();
    expect(r.candidates?.length).toBeGreaterThan(0);
    expect(r.candidates?.[0].canonicalProductId).toBe(1);
  });

  it("sends unknown items to review without candidates", () => {
    const r = matchOffer("zzzzz qqqqq wwwww", null, catalog, thresholds);
    expect(r.status).toBe(MatchStatus.NeedsReview);
    expect(r.candidates).toBeNull();
  });

  it("needs review when the catalog is empty", () => {
    const r = matchOffer("цемент", null, [], thresholds);
    expect(r.status).toBe(MatchStatus.NeedsReview);
    expect(r.canonicalProductId).toBeNull();
  });
});
