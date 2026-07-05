import { Body, Controller, Get, Post } from "@nestjs/common";

import { RateLimit } from "../common/rate-limit/rate-limit";
import { AuthService } from "./auth.service";
import { CurrentUser, Public, type AuthUser } from "./decorators";
import { LoginDto, TokenResponseDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit(10, 60)
  @Post("login")
  login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.auth.login(dto.email, dto.password);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }
}
