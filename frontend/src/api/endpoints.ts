import { apiFetch } from "./client";
import type {
  CanonicalProduct,
  ImportBatch,
  NewProductInput,
  PriceOffer,
  Supplier,
  TokenResponse,
  User,
} from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  me: () => apiFetch<User>("/auth/me"),
};

export const suppliersApi = {
  list: () => apiFetch<Supplier[]>("/suppliers"),
  create: (body: Omit<Supplier, "id">) =>
    apiFetch<Supplier>("/suppliers", { method: "POST", body }),
};

export const productsApi = {
  list: (params: { category?: string; q?: string } = {}) =>
    apiFetch<CanonicalProduct[]>(`/products${query(params)}`),
  create: (body: NewProductInput) =>
    apiFetch<CanonicalProduct>("/products", { method: "POST", body }),
  offers: (id: number) => apiFetch<PriceOffer[]>(`/products/${id}/offers`),
};

export interface ResolvePayload {
  action: "confirm" | "match" | "new" | "reject";
  canonicalProductId?: number;
  newProduct?: NewProductInput;
}

export const batchesApi = {
  list: (status?: string) =>
    apiFetch<ImportBatch[]>(`/batches${status ? `?status=${status}` : ""}`),
  get: (id: number) => apiFetch<ImportBatch>(`/batches/${id}`),
  offers: (id: number, status?: string) =>
    apiFetch<PriceOffer[]>(
      `/batches/${id}/offers${status ? `?status=${status}` : ""}`,
    ),
  upload: (supplierId: number, file: File) => {
    const form = new FormData();
    form.append("supplierId", String(supplierId));
    form.append("file", file);
    return apiFetch<ImportBatch>("/batches", {
      method: "POST",
      body: form,
      isForm: true,
    });
  },
  transition: (id: number, action: string) =>
    apiFetch<ImportBatch>(`/batches/${id}/transition`, {
      method: "POST",
      body: { action },
    }),
};

export const offersApi = {
  resolve: (id: number, payload: ResolvePayload) =>
    apiFetch<PriceOffer>(`/offers/${id}/resolve`, {
      method: "POST",
      body: payload,
    }),
};

function query(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v) as [
    string,
    string,
  ][];
  return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
}
