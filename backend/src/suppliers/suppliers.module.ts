import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ImportBatch } from "../imports/entities/import-batch.entity";
import { Supplier } from "./entities/supplier.entity";
import { SuppliersController } from "./suppliers.controller";
import { SuppliersService } from "./suppliers.service";

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, ImportBatch])],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
