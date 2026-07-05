import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  article?: string | null;

  @IsString()
  @MaxLength(128)
  category: string;

  @IsString()
  @MaxLength(32)
  baseUnit: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProductDto extends CreateProductDto {}
