import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { BatchFormat, BatchStatus, UserRole } from "../common/enums";
import { RateLimit } from "../common/rate-limit/rate-limit";
import { CurrentUser, Roles, type AuthUser } from "../auth/decorators";
import { BatchDispatcher } from "./batch-dispatcher.service";
import { BatchesService } from "./batches.service";
import { BatchTransitionDto, UploadBatchDto } from "./dto/batch.dto";

interface UploadedFileLike {
  originalname: string;
  buffer: Buffer;
  size: number;
}

function detectFormat(filename: string): BatchFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return BatchFormat.Csv;
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return BatchFormat.Xlsx;
  throw new BadRequestException("Unsupported file format (expected .csv or .xlsx)");
}

@Controller("batches")
export class BatchesController {
  constructor(
    private readonly batches: BatchesService,
    private readonly dispatcher: BatchDispatcher,
  ) {}

  @Roles(UserRole.Operator)
  @RateLimit(5, 60)
  @Post()
  @HttpCode(202)
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body() dto: UploadBatchDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException("file is required");
    const format = detectFormat(file.originalname);
    const batch = await this.batches.create(
      dto.supplierId,
      file.originalname,
      format,
      user.userId,
    );
    // Enqueue for the worker (production); inline when Redis is disabled (tests).
    await this.dispatcher.dispatch(batch.id, file.buffer);
    return this.batches.get(batch.id);
  }

  @Get()
  list(
    @Query("status") status?: BatchStatus,
    @Query("supplierId") supplierId?: string,
  ) {
    return this.batches.list(status, supplierId ? Number(supplierId) : undefined);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.batches.get(id);
  }

  @Get(":id/offers")
  offers(
    @Param("id", ParseIntPipe) id: number,
    @Query("status") status?: string,
  ) {
    return this.batches.listOffers(id, status);
  }

  @Roles(UserRole.Operator)
  @Post(":id/transition")
  transition(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: BatchTransitionDto,
  ) {
    return this.batches.operatorTransition(id, dto.action);
  }
}
