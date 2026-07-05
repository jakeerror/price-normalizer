import { IsEmail, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateSupplierDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @Matches(/^(\d{10}|\d{12})$/, { message: "inn must be 10 or 12 digits" })
  inn: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;
}

export class UpdateSupplierDto extends CreateSupplierDto {}
