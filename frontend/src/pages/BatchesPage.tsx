import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/client";
import { batchesApi, suppliersApi } from "../api/endpoints";
import type { BatchStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { StatusBadge } from "../components/StatusBadge";

const STATUSES: BatchStatus[] = [
  "uploaded",
  "parsing",
  "parsed",
  "normalizing",
  "needs_review",
  "completed",
  "failed",
];

export function BatchesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("");

  const batches = useQuery({
    queryKey: ["batches", status],
    queryFn: () => batchesApi.list(status || undefined),
    // Reflect background worker progress.
    refetchInterval: 4000,
  });
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => suppliersApi.list(),
  });

  const [supplierId, setSupplierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: () => batchesApi.upload(Number(supplierId), file as File),
    onSuccess: () => {
      setFile(null);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Ошибка загрузки"),
  });

  const onUpload = (e: FormEvent) => {
    e.preventDefault();
    if (!supplierId || !file) {
      setError("Выберите поставщика и файл");
      return;
    }
    upload.mutate();
  };

  return (
    <section>
      <div className="page-head">
        <h1>Прайс-листы</h1>
      </div>

      {user?.role === "operator" && (
        <form className="card inline-form" onSubmit={onUpload}>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— поставщик —</option>
            {suppliers.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button className="primary" type="submit" disabled={upload.isPending}>
            {upload.isPending ? "Загрузка…" : "Загрузить прайс"}
          </button>
          {error && <span className="error">{error}</span>}
        </form>
      )}

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Все статусы</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <table className="grid">
        <thead>
          <tr>
            <th>#</th>
            <th>Поставщик</th>
            <th>Файл</th>
            <th>Статус</th>
            <th>Матч / разбор / всего</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {batches.data?.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                Нет загруженных прайсов
              </td>
            </tr>
          )}
          {batches.data?.map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.supplier?.name ?? b.supplierId}</td>
              <td className="ellipsis">{b.filename}</td>
              <td>
                <StatusBadge status={b.status} />
              </td>
              <td>
                {b.matchedCount} / {b.reviewCount} / {b.totalRows}
              </td>
              <td>
                {b.reviewCount > 0 ? (
                  <Link to={`/batches/${b.id}`}>Разобрать →</Link>
                ) : (
                  <Link to={`/batches/${b.id}`}>Открыть</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
