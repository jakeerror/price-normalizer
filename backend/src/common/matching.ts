import { compareTwoStrings } from "string-similarity";

import { MatchMethod, MatchStatus } from "./enums";
import type { MatchCandidate } from "../offers/entities/price-offer.entity";
import { normalizeArticle } from "./normalization";

export interface CatalogItem {
  id: number;
  article: string | null;
  normalizedName: string;
  name: string;
}

export interface MatchThresholds {
  high: number;
  low: number;
}

export interface MatchResult {
  canonicalProductId: number | null;
  confidence: number | null;
  method: MatchMethod;
  status: MatchStatus;
  candidates: MatchCandidate[] | null;
}

const TOP_N = 3;

/**
 * Match a price-offer to the canonical catalog (SPEC §5.5):
 *   1. exact article match → auto_matched, confidence 1.0
 *   2. else fuzzy by normalized name:
 *        best >= high            → auto_matched
 *        low <= best < high      → needs_review (+ candidates)
 *        best < low              → needs_review (no candidate)
 */
export function matchOffer(
  normalizedName: string,
  rawArticle: string | null,
  catalog: CatalogItem[],
  thresholds: MatchThresholds,
): MatchResult {
  const article = normalizeArticle(rawArticle);
  if (article) {
    const byArticle = catalog.find(
      (c) => c.article && normalizeArticle(c.article) === article,
    );
    if (byArticle) {
      return {
        canonicalProductId: byArticle.id,
        confidence: 1,
        method: MatchMethod.Article,
        status: MatchStatus.AutoMatched,
        candidates: null,
      };
    }
  }

  if (catalog.length === 0) {
    return {
      canonicalProductId: null,
      confidence: null,
      method: MatchMethod.None,
      status: MatchStatus.NeedsReview,
      candidates: null,
    };
  }

  const scored = catalog
    .map((c) => ({
      canonicalProductId: c.id,
      name: c.name,
      score: compareTwoStrings(normalizedName, c.normalizedName),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  if (best.score >= thresholds.high) {
    return {
      canonicalProductId: best.canonicalProductId,
      confidence: round3(best.score),
      method: MatchMethod.Fuzzy,
      status: MatchStatus.AutoMatched,
      candidates: null,
    };
  }

  const candidates: MatchCandidate[] =
    best.score >= thresholds.low
      ? scored.slice(0, TOP_N).map((s) => ({
          canonicalProductId: s.canonicalProductId,
          name: s.name,
          score: round3(s.score),
        }))
      : [];

  return {
    canonicalProductId: null,
    confidence: round3(best.score),
    method: MatchMethod.None,
    status: MatchStatus.NeedsReview,
    candidates: candidates.length > 0 ? candidates : null,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
