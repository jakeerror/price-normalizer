export type Role = "operator" | "viewer";

export type BatchStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "normalizing"
  | "needs_review"
  | "completed"
  | "failed";

export type MatchStatus =
  | "auto_matched"
  | "needs_review"
  | "confirmed"
  | "manual_matched"
  | "new_product"
  | "rejected";

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  inn: string;
  contactPerson?: string | null;
  email?: string | null;
}

export interface CanonicalProduct {
  id: number;
  name: string;
  normalizedName: string;
  article: string | null;
  category: string;
  baseUnit: string;
  isActive: boolean;
}

export interface ImportBatch {
  id: number;
  supplierId: number;
  supplier?: Supplier;
  filename: string;
  format: "csv" | "xlsx";
  status: BatchStatus;
  totalRows: number;
  matchedCount: number;
  reviewCount: number;
  error: string | null;
  createdAt: string;
}

export interface MatchCandidate {
  canonicalProductId: number;
  name: string;
  score: number;
}

export interface PriceOffer {
  id: number;
  batchId: number;
  supplierId: number;
  canonicalProductId: number | null;
  rawName: string;
  normalizedName: string;
  rawArticle: string | null;
  price: string;
  currency: string;
  normalizedUnit: string;
  confidence: string | null;
  matchMethod: string;
  matchStatus: MatchStatus;
  matchCandidates: MatchCandidate[] | null;
  supplier?: Supplier;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
}

export interface NewProductInput {
  name: string;
  article?: string | null;
  category: string;
  baseUnit: string;
}
