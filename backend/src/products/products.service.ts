import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";

import type { CatalogItem } from "../common/matching";
import { normalizeName } from "../common/normalization";
import { PriceOffer } from "../offers/entities/price-offer.entity";
import { RedisService } from "../redis/redis.service";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { CanonicalProduct } from "./entities/canonical-product.entity";

const CACHE_TTL = 300;
const ACTIVE_CATALOG_KEY = "catalog:active";
const CACHE_PATTERN = "catalog:*";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(CanonicalProduct)
    private readonly repo: Repository<CanonicalProduct>,
    @InjectRepository(PriceOffer)
    private readonly offers: Repository<PriceOffer>,
    private readonly redis: RedisService,
  ) {}

  async list(category?: string, q?: string): Promise<CanonicalProduct[]> {
    const key = `catalog:list:${category ?? ""}:${q ?? ""}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as CanonicalProduct[];

    const where = [];
    if (q) {
      where.push({ name: ILike(`%${q}%`) }, { normalizedName: ILike(`%${q}%`) });
    }
    const result = await this.repo.find({
      where: category
        ? where.length > 0
          ? where.map((w) => ({ ...w, category }))
          : { category }
        : where.length > 0
          ? where
          : {},
      order: { name: "ASC" },
      take: 200,
    });
    await this.redis.setEx(key, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  async get(id: number): Promise<CanonicalProduct> {
    const key = `catalog:item:${id}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as CanonicalProduct;

    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    await this.redis.setEx(key, JSON.stringify(product), CACHE_TTL);
    return product;
  }

  async create(dto: CreateProductDto): Promise<CanonicalProduct> {
    const product = await this.repo.save(
      this.repo.create({ ...dto, normalizedName: normalizeName(dto.name) }),
    );
    await this.invalidate();
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<CanonicalProduct> {
    const product = await this.getEntity(id);
    Object.assign(product, dto, { normalizedName: normalizeName(dto.name) });
    const saved = await this.repo.save(product);
    await this.invalidate();
    return saved;
  }

  /** Soft delete — the row is referenced by offers, so we deactivate it. */
  async softDelete(id: number): Promise<void> {
    const product = await this.getEntity(id);
    product.isActive = false;
    await this.repo.save(product);
    await this.invalidate();
  }

  /** Active catalog projection used by the matcher (SPEC §5.5); cached. */
  async getActiveCatalog(): Promise<CatalogItem[]> {
    const cached = await this.redis.get(ACTIVE_CATALOG_KEY);
    if (cached) return JSON.parse(cached) as CatalogItem[];

    const rows = await this.repo.find({
      where: { isActive: true },
      select: { id: true, article: true, normalizedName: true, name: true },
    });
    const catalog = rows.map((r) => ({
      id: r.id,
      article: r.article,
      normalizedName: r.normalizedName,
      name: r.name,
    }));
    await this.redis.setEx(ACTIVE_CATALOG_KEY, JSON.stringify(catalog), CACHE_TTL);
    return catalog;
  }

  async getOffersForProduct(id: number): Promise<PriceOffer[]> {
    await this.getEntity(id);
    return this.offers.find({
      where: { canonicalProductId: id },
      relations: { supplier: true },
      order: { price: "ASC" },
    });
  }

  /** DB fetch without cache — used internally by mutations. */
  private async getEntity(id: number): Promise<CanonicalProduct> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  private invalidate(): Promise<void> {
    return this.redis.delByPattern(CACHE_PATTERN);
  }
}
