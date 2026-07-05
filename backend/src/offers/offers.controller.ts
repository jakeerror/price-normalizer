import { Body, Controller, Param, ParseIntPipe, Post } from "@nestjs/common";

import { UserRole } from "../common/enums";
import { CurrentUser, Roles, type AuthUser } from "../auth/decorators";
import { ResolveOfferDto } from "./dto/resolve.dto";
import { OffersService } from "./offers.service";

@Controller("offers")
export class OffersController {
  constructor(private readonly service: OffersService) {}

  @Roles(UserRole.Operator)
  @Post(":id/resolve")
  resolve(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResolveOfferDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.resolve(id, dto, user.userId);
  }
}
