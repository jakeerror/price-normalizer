import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { verifyPassword } from "../common/security/password";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";
import { JwtPayload } from "./jwt.strategy";
import { TokenResponseDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<TokenResponseDto> {
    const user = await this.users.findByEmailWithPassword(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (!user.isActive) {
      throw new UnauthorizedException("User is inactive");
    }
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: await this.jwt.signAsync(payload), tokenType: "bearer" };
  }

  async me(userId: number): Promise<Omit<User, "passwordHash">> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
