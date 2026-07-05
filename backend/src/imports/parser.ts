import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

import { BatchFormat } from "../common/enums";

export interface ParsedRow {
  name: string | null;
  price: string | null;
  unit: string | null;
  article: string | null;
}

type Field = "name" | "price" | "unit" | "article";

const HEADER_SYNONYMS: Record<Field, string[]> = {
  name: ["наименование", "название", "товар", "номенклатура", "name", "product"],
  price: ["цена", "стоимость", "price", "cost"],
  unit: ["ед", "ед.", "ед.изм", "единица", "unit", "uom"],
  article: ["артикул", "арт", "арт.", "sku", "код", "article", "code"],
};

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = {
    ";": (firstLine.match(/;/g) ?? []).length,
    ",": (firstLine.match(/,/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function toMatrix(buffer: Buffer, format: BatchFormat): string[][] {
  if (format === BatchFormat.Csv) {
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const records = parse(text, {
      delimiter: detectDelimiter(text),
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];
    return records;
  }
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
}

function buildColumnMap(cells: string[]): Partial<Record<Field, number>> {
  const map: Partial<Record<Field, number>> = {};
  cells.forEach((cell, idx) => {
    const header = String(cell ?? "").trim().toLowerCase();
    for (const field of Object.keys(HEADER_SYNONYMS) as Field[]) {
      if (map[field] === undefined && HEADER_SYNONYMS[field].includes(header)) {
        map[field] = idx;
      }
    }
  });
  return map;
}

/** Find the header row among the first rows (needs at least name + price). */
function findHeader(matrix: string[][]): {
  index: number;
  map: Partial<Record<Field, number>>;
} {
  const limit = Math.min(matrix.length, 10);
  for (let i = 0; i < limit; i++) {
    const map = buildColumnMap(matrix[i]);
    if (map.name !== undefined && map.price !== undefined) {
      return { index: i, map };
    }
  }
  throw new Error(
    'Не удалось определить заголовок: нужны столбцы «наименование» и «цена»',
  );
}

export function parseBuffer(buffer: Buffer, format: BatchFormat): ParsedRow[] {
  const matrix = toMatrix(buffer, format);
  if (matrix.length === 0) throw new Error("Файл пустой");

  const { index, map } = findHeader(matrix);
  const rows: ParsedRow[] = [];

  for (let i = index + 1; i < matrix.length; i++) {
    const cells = matrix[i];
    const get = (field: Field): string | null => {
      const col = map[field];
      if (col === undefined) return null;
      const value = String(cells[col] ?? "").trim();
      return value.length > 0 ? value : null;
    };
    const name = get("name");
    const price = get("price");
    if (!name && !price) continue; // fully empty row
    rows.push({ name, price, unit: get("unit"), article: get("article") });
  }
  return rows;
}
