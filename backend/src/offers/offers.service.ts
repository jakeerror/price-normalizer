import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MatchMethod, MatchStatus } from "../common/enums";
import { BatchesService } from "../imports/batches.service";
import { ProductsService } from "../products/products.service";
import { ResolveAction, ResolveOfferDto } from "./dto/resolve.dto";
import { PriceOffer } from "./entities/price-offer.entity";

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(PriceOffer)
    private readonly repo: Repository<PriceOffer>,
    private readonly products: ProductsService,
    private readonly batches: BatchesService,
  ) {}

  async resolve(
    offerId: number,
    dto: ResolveOfferDto,
    userId: number,
  ): Promise<PriceOffer> {
    const offer = await this.repo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException(`Offer ${offerId} not found`);
    if (offer.matchStatus !== MatchStatus.NeedsReview) {
      throw new ConflictException("Offer is not awaiting review");
    }

    switch (dto.action) {
      case ResolveAction.Confirm: {
        const candidate = offer.matchCandidates?.[0];
        if (!candidate) {
          throw new UnprocessableEntityException("No candidate to confirm");
        }
        offer.canonicalProductId = candidate.canonicalProductId;
        offer.matchStatus = MatchStatus.Confirmed;
        offer.matchMethod = MatchMethod.Manual;
        break;
      }
      case ResolveAction.Match: {
        if (!dto.canonicalProductId) {
          throw new UnprocessableEntityException("canonical_product_id is required");
        }
        const product = await this.products.get(dto.canonicalProductId);
        offer.canonicalProductId = product.id;
        offer.matchStatus = MatchStatus.ManualMatched;
        offer.matchMethod = MatchMethod.Manual;
        break;
      }
      case ResolveAction.New: {
        if (!dto.newProduct) {
          throw new UnprocessableEntityException("new_product is required");
        }
        const product = await this.products.create(dto.newProduct);
        offer.canonicalProductId = product.id;
        offer.matchStatus = MatchStatus.NewProduct;
        offer.matchMethod = MatchMethod.Manual;
        break;
      }
      case ResolveAction.Reject: {
        offer.matchStatus = MatchStatus.Rejected;
        break;
      }
    }

    offer.reviewedById = userId;
    const saved = await this.repo.save(offer);
    await this.batches.onOfferResolved(offer.batchId);
    return saved;
  }
}
