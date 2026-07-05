import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PriceOffer } from "../offers/entities/price-offer.entity";
import { ProductsModule } from "../products/products.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { BatchDispatcher } from "./batch-dispatcher.service";
import { BatchProcessorService } from "./batch-processor.service";
import { BatchesController } from "./batches.controller";
import { BatchesService } from "./batches.service";
import { ImportBatch } from "./entities/import-batch.entity";
import { RawRow } from "./entities/raw-row.entity";
import { IMPORTS_QUEUE, ImportsProcessor } from "./imports.processor";

const REDIS_ENABLED = process.env.DISABLE_REDIS !== "true";
// The queue consumer runs only in the dedicated worker process (WORKER=true);
// the api process enqueues but does not consume.
const IS_WORKER = process.env.WORKER === "true";

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportBatch, RawRow, PriceOffer]),
    SuppliersModule,
    ProductsModule,
    // The queue (and its worker) only exist when Redis is enabled; otherwise the
    // dispatcher runs processing inline.
    ...(REDIS_ENABLED ? [BullModule.registerQueue({ name: IMPORTS_QUEUE })] : []),
  ],
  controllers: [BatchesController],
  providers: [
    BatchesService,
    BatchProcessorService,
    BatchDispatcher,
    ...(REDIS_ENABLED && IS_WORKER ? [ImportsProcessor] : []),
  ],
  exports: [BatchesService],
})
export class ImportsModule {}
