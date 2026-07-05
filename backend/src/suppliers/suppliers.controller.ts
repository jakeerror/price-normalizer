import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";

import { UserRole } from "../common/enums";
import { Roles } from "../auth/decorators";
import { CreateSupplierDto, UpdateSupplierDto } from "./dto/supplier.dto";
import { SuppliersService } from "./suppliers.service";

@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  list(@Query("q") q?: string) {
    return this.service.list(q);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Roles(UserRole.Operator)
  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.Operator)
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.Operator)
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
