import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PriceOffer } from "../offers/entities/price-offer.entity";
import { CanonicalProduct } from "./entities/canonical-product.entity";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [TypeOrmModule.forFeature([CanonicalProduct, PriceOffer])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
