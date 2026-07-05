import type { BatchStatus } from "../api/types";

const LABELS: Record<BatchStatus, string> = {
  uploaded: "Загружен",
  parsing: "Разбор",
  parsed: "Разобран",
  normalizing: "Нормализация",
  needs_review: "На разборе",
  completed: "Готов",
  failed: "Ошибка",
};

export function StatusBadge({ status }: { status: BatchStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
