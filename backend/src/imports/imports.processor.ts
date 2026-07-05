import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { BatchProcessorService } from "./batch-processor.service";

export const IMPORTS_QUEUE = "imports";

interface ImportJobData {
  batchId: number;
  file: string; // base64-encoded upload
}

/** Consumes queued batch imports and runs the pipeline (SPEC §7.2). */
@Processor(IMPORTS_QUEUE)
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(private readonly processor: BatchProcessorService) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    this.logger.log(`Processing batch ${job.data.batchId}`);
    await this.processor.process(
      job.data.batchId,
      Buffer.from(job.data.file, "base64"),
    );
  }
}
