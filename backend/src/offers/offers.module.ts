import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ImportsModule } from "../imports/imports.module";
import { ProductsModule } from "../products/products.module";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";
import { PriceOffer } from "./entities/price-offer.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PriceOffer]), ImportsModule, ProductsModule],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
