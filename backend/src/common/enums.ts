export enum UserRole {
  Operator = "operator",
  Viewer = "viewer",
}

export enum BatchFormat {
  Csv = "csv",
  Xlsx = "xlsx",
}

/** ImportBatch lifecycle stages (SPEC §5.1). */
export enum BatchStatus {
  Uploaded = "uploaded",
  Parsing = "parsing",
  Parsed = "parsed",
  Normalizing = "normalizing",
  NeedsReview = "needs_review",
  Completed = "completed",
  Failed = "failed",
}

export enum MatchMethod {
  Article = "article",
  Fuzzy = "fuzzy",
  Manual = "manual",
  None = "none",
}

/** PriceOffer resolution status (SPEC §5.3). */
export enum MatchStatus {
  AutoMatched = "auto_matched",
  NeedsReview = "needs_review",
  Confirmed = "confirmed",
  ManualMatched = "manual_matched",
  NewProduct = "new_product",
  Rejected = "rejected",
}
