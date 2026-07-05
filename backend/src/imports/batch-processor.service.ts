import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BatchStatus, MatchStatus } from "../common/enums";
import { matchOffer } from "../common/matching";
import {
  normalizeCurrency,
  normalizeName,
  normalizeNumber,
  normalizeUnit,
} from "../common/normalization";
import { PriceOffer } from "../offers/entities/price-offer.entity";
import { ProductsService } from "../products/products.service";
import { BatchesService } from "./batches.service";
import { ImportBatch } from "./entities/import-batch.entity";
import { ParsedRow, parseBuffer } from "./parser";
import { RawRow } from "./entities/raw-row.entity";

@Injectable()
export class BatchProcessorService {
  private readonly logger = new Logger(BatchProcessorService.name);

  constructor(
    private readonly batches: BatchesService,
    private readonly products: ProductsService,
    private readonly config: ConfigService,
    @InjectRepository(RawRow)
    private readonly rawRows: Repository<RawRow>,
    @InjectRepository(PriceOffer)
    private readonly offers: Repository<PriceOffer>,
  ) {}

  /**
   * Full pipeline for one batch (SPEC §5). Called synchronously in step 3;
   * step 5 moves the trigger into a BullMQ worker (this method is unchanged).
   */
  async process(batchId: number, buffer: Buffer): Promise<ImportBatch> {
    let batch = await this.batches.getEntity(batchId);
    try {
      batch = await this.batches.applyTransition(batch, "start_parse");

      const parsed = parseBuffer(buffer, batch.format);
      const savedRows = await this.rawRows.save(
        parsed.map((row, i) =>
          this.rawRows.create({
            batchId,
            rowIndex: i,
            rawData: row as unknown as Record<string, unknown>,
            parseError: row.name && row.price ? null : "missing name or price",
          }),
        ),
      );
      batch.totalRows = savedRows.length;
      batch = await this.batches.applyTransition(batch, "parse_ok");

      batch = await this.batches.applyTransition(batch, "start_normalize");
      const { matched, review } = await this.normalizeAndMatch(batch, savedRows);
      batch.matchedCount = matched;
      batch.reviewCount = review;

      batch = await this.batches.applyTransition(
        batch,
        review > 0 ? "to_review" : "auto_complete",
      );
      return batch;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Batch ${batchId} failed: ${message}`);
      batch.error = message;
      const failAction =
        batch.status === BatchStatus.Parsing ? "parse_fail" : "normalize_fail";
      // Only transition to failed if the current stage allows it.
      try {
        batch = await this.batches.applyTransition(batch, failAction);
      } catch {
        /* already terminal / unexpected stage — leave as is */
      }
      return batch;
    }
  }

  private async normalizeAndMatch(
    batch: ImportBatch,
    rows: RawRow[],
  ): Promise<{ matched: number; review: number }> {
    const catalog = await this.products.getActiveCatalog();
    const thresholds = {
      high: this.config.get<number>("match.high", 0.9),
      low: this.config.get<number>("match.low", 0.6),
    };

    let matched = 0;
    let review = 0;
    const offers: PriceOffer[] = [];

    for (const raw of rows) {
      if (raw.parseError) continue;
      const row = raw.rawData as unknown as ParsedRow;
      const normalizedName = normalizeName(row.name ?? "");
      const priceValue = normalizeNumber(row.price ?? "");
      const result = matchOffer(
        normalizedName,
        row.article,
        catalog,
        thresholds,
      );

      offers.push(
        this.offers.create({
          batchId: batch.id,
          rawRowId: raw.id,
          supplierId: batch.supplierId,
          canonicalProductId: result.canonicalProductId,
          rawName: row.name ?? "",
          normalizedName,
          rawArticle: row.article,
          price: (priceValue ?? 0).toFixed(2),
          currency: normalizeCurrency(null),
          normalizedUnit: normalizeUnit(row.unit ?? ""),
          confidence: result.confidence === null ? null : result.confidence.toFixed(3),
          matchMethod: result.method,
          matchStatus: result.status,
          matchCandidates: result.candidates,
        }),
      );

      if (result.status === MatchStatus.AutoMatched) matched++;
      else review++;
    }

    await this.offers.save(offers);
    return { matched, review };
  }
}
