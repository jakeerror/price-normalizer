import { Type } from "class-transformer";
import { IsIn, IsInt } from "class-validator";

import type { BatchAction } from "../../common/pipeline/batch-transitions";

export class UploadBatchDto {
  @Type(() => Number)
  @IsInt()
  supplierId: number;
}

const OPERATOR_ACTIONS: BatchAction[] = ["finish_review", "retry"];

export class BatchTransitionDto {
  @IsIn(OPERATOR_ACTIONS)
  action: BatchAction;
}
