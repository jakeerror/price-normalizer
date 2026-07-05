import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CanonicalProduct } from "../products/entities/canonical-product.entity";
import { PriceOffer } from "../offers/entities/price-offer.entity";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";

@Module({
  imports: [TypeOrmModule.forFeature([CanonicalProduct, PriceOffer])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
