import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "../api/client";
import { batchesApi, offersApi, type ResolvePayload } from "../api/endpoints";
import type { NewProductInput, PriceOffer } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";

export function BatchReviewPage() {
  const { id } = useParams();
  const batchId = Number(id);
  const queryClient = useQueryClient();

  const batch = useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => batchesApi.get(batchId),
  });
  const offers = useQuery({
    queryKey: ["batch-offers", batchId],
    queryFn: () => batchesApi.offers(batchId, "needs_review"),
  });

  const resolve = useMutation({
    mutationFn: (vars: { offerId: number; payload: ResolvePayload }) =>
      offersApi.resolve(vars.offerId, vars.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
      void queryClient.invalidateQueries({ queryKey: ["batch-offers", batchId] });
      void queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (e) => alert(e instanceof ApiError ? e.message : "Ошибка"),
  });

  if (batch.isLoading) return <p>Загрузка…</p>;
  if (!batch.data) return <p className="error">Батч не найден</p>;

  return (
    <section>
      <div className="page-head">
        <h1>
          Прайс #{batch.data.id} <StatusBadge status={batch.data.status} />
        </h1>
        <Link to="/batches">← к списку</Link>
      </div>

      <p className="muted">
        {batch.data.filename} · сопоставлено {batch.data.matchedCount}, на разборе{" "}
        {batch.data.reviewCount} из {batch.data.totalRows}
      </p>

      {offers.data?.length === 0 && (
        <p className="muted">Все позиции разобраны ✓</p>
      )}

      <div className="offers">
        {offers.data?.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            busy={resolve.isPending}
            onResolve={(payload) => resolve.mutate({ offerId: offer.id, payload })}
          />
        ))}
      </div>
    </section>
  );
}

function OfferCard({
  offer,
  busy,
  onResolve,
}: {
  offer: PriceOffer;
  busy: boolean;
  onResolve: (payload: ResolvePayload) => void;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="card offer">
      <div className="offer-head">
        <b>{offer.rawName}</b>
        <span className="muted small">
          {offer.price} {offer.currency} · {offer.normalizedUnit}
          {offer.rawArticle ? ` · арт. ${offer.rawArticle}` : ""}
          {offer.confidence ? ` · схожесть ${offer.confidence}` : ""}
        </span>
      </div>

      {offer.matchCandidates && offer.matchCandidates.length > 0 ? (
        <div className="candidates">
          <span className="muted small">Кандидаты:</span>
          {offer.matchCandidates.map((c) => (
            <div key={c.canonicalProductId} className="candidate">
              <span>
                {c.name} <span className="muted small">({c.score})</span>
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  onResolve({ action: "match", canonicalProductId: c.canonicalProductId })
                }
              >
                Выбрать
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">Подходящих кандидатов не найдено</p>
      )}

      {creating ? (
        <NewProductForm
          defaultName={offer.rawName}
          defaultUnit={offer.normalizedUnit}
          defaultArticle={offer.rawArticle}
          busy={busy}
          onCancel={() => setCreating(false)}
          onSubmit={(newProduct) => onResolve({ action: "new", newProduct })}
        />
      ) : (
        <div className="offer-actions">
          <button disabled={busy} onClick={() => setCreating(true)}>
            + Новый товар
          </button>
          <button
            disabled={busy}
            className="danger"
            onClick={() => onResolve({ action: "reject" })}
          >
            Отклонить
          </button>
        </div>
      )}
    </div>
  );
}

function NewProductForm({
  defaultName,
  defaultUnit,
  defaultArticle,
  busy,
  onCancel,
  onSubmit,
}: {
  defaultName: string;
  defaultUnit: string;
  defaultArticle: string | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (product: NewProductInput) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState("Прочее");
  const [baseUnit, setBaseUnit] = useState(defaultUnit);

  return (
    <div className="inline-form">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Категория"
      />
      <input
        value={baseUnit}
        onChange={(e) => setBaseUnit(e.target.value)}
        placeholder="Ед."
      />
      <button
        className="primary"
        disabled={busy}
        onClick={() =>
          onSubmit({ name, category, baseUnit, article: defaultArticle })
        }
      >
        Создать и сопоставить
      </button>
      <button disabled={busy} onClick={onCancel}>
        Отмена
      </button>
    </div>
  );
}
