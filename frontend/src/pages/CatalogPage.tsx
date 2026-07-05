import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/client";
import { productsApi, suppliersApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

export function CatalogPage() {
  return (
    <section>
      <div className="page-head">
        <h1>Каталог и поставщики</h1>
      </div>
      <div className="catalog">
        <ProductsPanel />
        <SuppliersPanel />
      </div>
    </section>
  );
}

function ProductsPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(),
  });
  const [form, setForm] = useState({ name: "", article: "", category: "", baseUnit: "" });
  const [error, setError] = useState<string | null>(null);
  const [pricesFor, setPricesFor] = useState<number | null>(null);

  const create = useMutation({
    mutationFn: () =>
      productsApi.create({
        name: form.name,
        article: form.article || null,
        category: form.category,
        baseUnit: form.baseUnit,
      }),
    onSuccess: () => {
      setForm({ name: "", article: "", category: "", baseUnit: "" });
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Ошибка"),
  });

  const prices = useQuery({
    queryKey: ["product-offers", pricesFor],
    queryFn: () => productsApi.offers(pricesFor as number),
    enabled: pricesFor !== null,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div className="card">
      <h2>Эталонная номенклатура</h2>
      <table className="grid">
        <thead>
          <tr>
            <th>Название</th>
            <th>Артикул</th>
            <th>Категория</th>
            <th>Ед.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.data?.map((p) => (
            <tr key={p.id} className={p.isActive ? "" : "inactive"}>
              <td>{p.name}</td>
              <td>{p.article ?? "—"}</td>
              <td>{p.category}</td>
              <td>{p.baseUnit}</td>
              <td>
                <button onClick={() => setPricesFor(p.id)}>Цены</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pricesFor !== null && (
        <div className="prices">
          <div className="prices-head">
            <b>Сравнение цен</b>
            <button onClick={() => setPricesFor(null)}>×</button>
          </div>
          {prices.data?.length === 0 && <p className="muted small">Нет предложений</p>}
          {prices.data?.map((o) => (
            <div key={o.id} className="price-row">
              <span>{o.supplier?.name ?? o.supplierId}</span>
              <span>
                {o.price} {o.currency} / {o.normalizedUnit}
              </span>
            </div>
          ))}
        </div>
      )}

      {user?.role === "operator" && (
        <form className="inline-form" onSubmit={onSubmit}>
          <input placeholder="Название" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Артикул" value={form.article} onChange={(e) => setForm({ ...form, article: e.target.value })} />
          <input placeholder="Категория" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input placeholder="Ед." required value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} />
          <button className="primary" type="submit" disabled={create.isPending}>
            Добавить
          </button>
          {error && <span className="error">{error}</span>}
        </form>
      )}
    </div>
  );
}

function SuppliersPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => suppliersApi.list(),
  });
  const [form, setForm] = useState({ name: "", inn: "", contactPerson: "" });
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      suppliersApi.create({
        name: form.name,
        inn: form.inn,
        contactPerson: form.contactPerson || null,
      }),
    onSuccess: () => {
      setForm({ name: "", inn: "", contactPerson: "" });
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Ошибка"),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <div className="card">
      <h2>Поставщики</h2>
      <table className="grid">
        <thead>
          <tr>
            <th>Название</th>
            <th>ИНН</th>
            <th>Контакт</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.data?.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.inn}</td>
              <td>{s.contactPerson ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {user?.role === "operator" && (
        <form className="inline-form" onSubmit={onSubmit}>
          <input placeholder="Название" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="ИНН (10/12 цифр)" required value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })} />
          <input placeholder="Контактное лицо" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <button className="primary" type="submit" disabled={create.isPending}>
            Добавить
          </button>
          {error && <span className="error">{error}</span>}
        </form>
      )}
    </div>
  );
}
