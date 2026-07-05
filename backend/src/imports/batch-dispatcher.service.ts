import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Optional } from "@nestjs/common";
import { Queue } from "bullmq";

import { BatchProcessorService } from "./batch-processor.service";
import { IMPORTS_QUEUE } from "./imports.processor";

/**
 * Routes batch processing either to the BullMQ queue (production) or runs it
 * inline (tests / DISABLE_REDIS, where no queue provider is registered).
 */
@Injectable()
export class BatchDispatcher {
  constructor(
    @Optional()
    @InjectQueue(IMPORTS_QUEUE)
    private readonly queue: Queue | undefined,
    private readonly processor: BatchProcessorService,
  ) {}

  async dispatch(batchId: number, buffer: Buffer): Promise<void> {
    if (this.queue) {
      await this.queue.add(
        "process",
        { batchId, file: buffer.toString("base64") },
        { attempts: 1, removeOnComplete: true, removeOnFail: 100 },
      );
    } else {
      await this.processor.process(batchId, buffer);
    }
  }
}
