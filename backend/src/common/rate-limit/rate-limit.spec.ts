import { ExecutionContext, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RedisService } from "../../redis/redis.service";
import { RATE_LIMIT_KEY, RateLimitGuard } from "./rate-limit";

function contextFor(handler: () => void): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class Ctrl {},
    switchToHttp: () => ({ getRequest: () => ({ ip: "1.2.3.4" }) }),
  } as unknown as ExecutionContext;
}

function limitedHandler(limit: number, windowSeconds: number): () => void {
  const handler = (): void => {};
  Reflect.defineMetadata(RATE_LIMIT_KEY, { limit, windowSeconds }, handler);
  return handler;
}

describe("RateLimitGuard", () => {
  const reflector = new Reflector();

  it("allows requests with no @RateLimit metadata", async () => {
    const redis = { incrWithExpire: jest.fn() } as unknown as RedisService;
    const guard = new RateLimitGuard(reflector, redis);
    await expect(guard.canActivate(contextFor(() => {}))).resolves.toBe(true);
    expect(redis.incrWithExpire).not.toHaveBeenCalled();
  });

  it("allows up to the limit, then throws 429", async () => {
    let count = 0;
    const redis = {
      incrWithExpire: jest.fn(async () => ++count),
    } as unknown as RedisService;
    const guard = new RateLimitGuard(reflector, redis);
    const ctx = contextFor(limitedHandler(2, 60));

    await expect(guard.canActivate(ctx)).resolves.toBe(true); // 1
    await expect(guard.canActivate(ctx)).resolves.toBe(true); // 2
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException); // 3 → 429
  });

  it("fails open when Redis is unavailable (incr returns null)", async () => {
    const redis = {
      incrWithExpire: jest.fn(async () => null),
    } as unknown as RedisService;
    const guard = new RateLimitGuard(reflector, redis);
    const ctx = contextFor(limitedHandler(1, 60));

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
