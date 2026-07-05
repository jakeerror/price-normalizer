import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";

import { ImportBatch } from "../imports/entities/import-batch.entity";
import { CreateSupplierDto, UpdateSupplierDto } from "./dto/supplier.dto";
import { Supplier } from "./entities/supplier.entity";

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
    @InjectRepository(ImportBatch)
    private readonly batches: Repository<ImportBatch>,
  ) {}

  list(q?: string): Promise<Supplier[]> {
    return this.repo.find({
      where: q ? [{ name: ILike(`%${q}%`) }, { inn: ILike(`%${q}%`) }] : {},
      order: { name: "ASC" },
      take: 200,
    });
  }

  async get(id: number): Promise<Supplier> {
    const supplier = await this.repo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    if (await this.repo.exists({ where: { inn: dto.inn } })) {
      throw new ConflictException(`Supplier with INN ${dto.inn} already exists`);
    }
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.get(id);
    if (
      dto.inn !== supplier.inn &&
      (await this.repo.exists({ where: { inn: dto.inn } }))
    ) {
      throw new ConflictException(`Supplier with INN ${dto.inn} already exists`);
    }
    Object.assign(supplier, dto);
    return this.repo.save(supplier);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.get(id);
    const referenced = await this.batches.exists({
      where: { supplierId: id },
    });
    if (referenced) {
      throw new ConflictException("Supplier is referenced by existing batches");
    }
    await this.repo.remove(supplier);
  }
}
