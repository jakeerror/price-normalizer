import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  ValidateNested,
} from "class-validator";

import { CreateProductDto } from "../../products/dto/product.dto";

export enum ResolveAction {
  Confirm = "confirm",
  Match = "match",
  New = "new",
  Reject = "reject",
}

export class ResolveOfferDto {
  @IsEnum(ResolveAction)
  action: ResolveAction;

  @IsOptional()
  @IsInt()
  canonicalProductId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProductDto)
  newProduct?: CreateProductDto;
}
