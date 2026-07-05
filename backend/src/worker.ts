import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

/**
 * Dedicated worker process (WORKER=true): boots the app context without an HTTP
 * server. The BullMQ WorkerHost keeps the process alive consuming the queue.
 */
async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });
  new Logger("Worker").log("Import worker started — consuming 'imports' queue");
}

void bootstrap();
