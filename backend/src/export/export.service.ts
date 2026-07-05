import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, IsNull, Repository } from "typeorm";

import { MatchStatus } from "../common/enums";
import { CanonicalProduct } from "../products/entities/canonical-product.entity";
import { PriceOffer } from "../offers/entities/price-offer.entity";

/** Clean catalog row shaped for Mini-SRM ingestion (SPEC §8 export). */
export interface CatalogExportItem {
  productId: number;
  name: string;
  article: string | null;
  category: string;
  unit: string;
  supplier: string;
  price: string;
  currency: string;
}

const RESOLVED: MatchStatus[] = [
  MatchStatus.AutoMatched,
  MatchStatus.Confirmed,
  MatchStatus.ManualMatched,
  MatchStatus.NewProduct,
];

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(CanonicalProduct)
    private readonly products: Repository<CanonicalProduct>,
    @InjectRepository(PriceOffer)
    private readonly offers: Repository<PriceOffer>,
  ) {}

  async getCatalog(mode: "best" | "all"): Promise<CatalogExportItem[]> {
    const products = await this.products.find({ where: { isActive: true } });
    const productById = new Map(products.map((p) => [p.id, p]));

    const offers = await this.offers.find({
      where: { matchStatus: In(RESOLVED), canonicalProductId: Not(IsNull()) },
      relations: { supplier: true },
      order: { price: "ASC" },
    });

    const items: CatalogExportItem[] = [];
    const seenBestFor = new Set<number>();

    for (const offer of offers) {
      const product = productById.get(offer.canonicalProductId as number);
      if (!product) continue;
      if (mode === "best") {
        if (seenBestFor.has(product.id)) continue; // offers sorted by price ASC → first is cheapest
        seenBestFor.add(product.id);
      }
      items.push({
        productId: product.id,
        name: product.name,
        article: product.article,
        category: product.category,
        unit: product.baseUnit,
        supplier: offer.supplier.name,
        price: offer.price,
        currency: offer.currency,
      });
    }
    return items;
  }

  toCsv(items: CatalogExportItem[]): string {
    const header = [
      "product_id",
      "name",
      "article",
      "category",
      "unit",
      "supplier",
      "price",
      "currency",
    ];
    const escape = (v: string | number | null): string => {
      const s = v === null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const it of items) {
      lines.push(
        [
          it.productId,
          it.name,
          it.article,
          it.category,
          it.unit,
          it.supplier,
          it.price,
          it.currency,
        ]
          .map(escape)
          .join(","),
      );
    }
    return lines.join("\n");
  }
}
