import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Thin ioredis wrapper. Degrades gracefully: when DISABLE_REDIS=true (tests) or
 * on any connection error, reads return null / rate limits allow, so the API
 * stays available without Redis (SPEC §7).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor(config: ConfigService) {
    if (process.env.DISABLE_REDIS === "true") {
      this.client = null;
      return;
    }
    this.client = new Redis({
      host: config.get<string>("redis.host", "localhost"),
      port: config.get<number>("redis.port", 6379),
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    this.client.on("error", (err) =>
      this.logger.warn(`Redis error: ${err.message}`),
    );
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, value, "EX", ttlSeconds);
    } catch {
      /* cache write is best-effort */
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) await this.client.del(...keys);
    } catch {
      /* best-effort invalidation */
    }
  }

  /** Atomic counter for rate limiting; returns null if Redis is unavailable. */
  async incrWithExpire(key: string, windowSeconds: number): Promise<number | null> {
    if (!this.client) return null;
    try {
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, windowSeconds);
      return count;
    } catch {
      return null;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  onModuleDestroy(): void {
    this.client?.disconnect();
  }
}
