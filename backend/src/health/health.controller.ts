import { Controller, Get } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { Public } from "../auth/decorators";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async health(): Promise<{ status: string; db: string; redis: string }> {
    await this.dataSource.query("SELECT 1");
    const redisOk = this.redis.enabled ? await this.redis.ping() : false;
    const redisStatus = this.redis.enabled ? (redisOk ? "ok" : "down") : "disabled";
    return {
      status: redisStatus === "down" ? "degraded" : "ok",
      db: "ok",
      redis: redisStatus,
    };
  }
}
