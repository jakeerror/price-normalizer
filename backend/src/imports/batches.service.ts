import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BatchStatus } from "../common/enums";
import {
  BatchAction,
  getTransition,
} from "../common/pipeline/batch-transitions";
import { PriceOffer } from "../offers/entities/price-offer.entity";
import { SuppliersService } from "../suppliers/suppliers.service";
import { BatchFormat } from "../common/enums";
import { ImportBatch } from "./entities/import-batch.entity";

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(ImportBatch)
    private readonly repo: Repository<ImportBatch>,
    @InjectRepository(PriceOffer)
    private readonly offers: Repository<PriceOffer>,
    private readonly suppliers: SuppliersService,
  ) {}

  list(status?: BatchStatus, supplierId?: number): Promise<ImportBatch[]> {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    return this.repo.find({
      where,
      relations: { supplier: true },
      order: { id: "DESC" },
      take: 200,
    });
  }

  async get(id: number): Promise<ImportBatch> {
    const batch = await this.repo.findOne({
      where: { id },
      relations: { supplier: true },
    });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);
    return batch;
  }

  async getEntity(id: number): Promise<ImportBatch> {
    const batch = await this.repo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);
    return batch;
  }

  async create(
    supplierId: number,
    filename: string,
    format: BatchFormat,
    uploadedById: number,
  ): Promise<ImportBatch> {
    await this.suppliers.get(supplierId); // 404 if supplier missing
    const batch = this.repo.create({
      supplierId,
      filename,
      format,
      uploadedById,
      status: BatchStatus.Uploaded,
    });
    return this.repo.save(batch);
  }

  /**
   * Apply a stage transition (SPEC §5.2). Legality is a table lookup — invalid
   * (status, action) pairs throw 409. Persists the batch (incl. any counter/error
   * fields set by the caller before the call).
   */
  async applyTransition(
    batch: ImportBatch,
    action: BatchAction,
  ): Promise<ImportBatch> {
    const transition = getTransition(batch.status, action);
    if (!transition) {
      throw new ConflictException(
        `Transition '${action}' is not allowed from status '${batch.status}'`,
      );
    }
    batch.status = transition.to;
    return this.repo.save(batch);
  }

  /** Operator-triggered transition via HTTP (finish_review / retry). */
  async operatorTransition(id: number, action: BatchAction): Promise<ImportBatch> {
    const batch = await this.getEntity(id);
    const transition = getTransition(batch.status, action);
    if (!transition) {
      throw new ConflictException(
        `Transition '${action}' is not allowed from status '${batch.status}'`,
      );
    }
    if (transition.actor !== "operator") {
      throw new ForbiddenException(
        `Transition '${action}' is performed by the system, not manually`,
      );
    }
    if (action === "finish_review" && batch.reviewCount > 0) {
      throw new ConflictException(
        `${batch.reviewCount} offer(s) still need review`,
      );
    }
    return this.applyTransition(batch, action);
  }

  /** Called after an offer leaves needs_review: decrement counter, auto-complete. */
  async onOfferResolved(batchId: number): Promise<void> {
    const batch = await this.getEntity(batchId);
    batch.reviewCount = Math.max(0, batch.reviewCount - 1);
    if (batch.reviewCount === 0 && batch.status === BatchStatus.NeedsReview) {
      await this.applyTransition(batch, "finish_review");
    } else {
      await this.repo.save(batch);
    }
  }

  listOffers(batchId: number, status?: string): Promise<PriceOffer[]> {
    const where: Record<string, unknown> = { batchId };
    if (status) where.matchStatus = status;
    return this.offers.find({
      where,
      order: { id: "ASC" },
      take: 500,
    });
  }
}
