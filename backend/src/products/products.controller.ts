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
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(@Query("category") category?: string, @Query("q") q?: string) {
    return this.service.list(category, q);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Get(":id/offers")
  offers(@Param("id", ParseIntPipe) id: number) {
    return this.service.getOffersForProduct(id);
  }

  @Roles(UserRole.Operator)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.Operator)
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.Operator)
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.service.softDelete(id);
  }
}
