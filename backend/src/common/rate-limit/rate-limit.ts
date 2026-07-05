import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RedisService } from "../../redis/redis.service";

export const RATE_LIMIT_KEY = "rateLimit";

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

/** Per-user (or per-IP) rate limit backed by Redis (SPEC §7.3). */
export const RateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds });

interface RequestLike {
  user?: { userId: number };
  ip?: string;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const req = context.switchToHttp().getRequest<RequestLike>();
    const identifier = req.user?.userId ?? req.ip ?? "anonymous";
    const key = `rl:${context.getClass().name}.${context.getHandler().name}:${identifier}`;

    const count = await this.redis.incrWithExpire(key, options.windowSeconds);
    if (count !== null && count > options.limit) {
      throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
