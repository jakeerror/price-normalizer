import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard, RolesGuard } from "./auth/guards";
import { RateLimitGuard } from "./common/rate-limit/rate-limit";
import configuration from "./config/configuration";
import { RedisModule } from "./redis/redis.module";
import { ExportModule } from "./export/export.module";
import { HealthModule } from "./health/health.module";
import { ImportsModule } from "./imports/imports.module";
import { OffersModule } from "./offers/offers.module";
import { ProductsModule } from "./products/products.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { UsersModule } from "./users/users.module";

const REDIS_ENABLED = process.env.DISABLE_REDIS !== "true";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    RedisModule,
    ...(REDIS_ENABLED
      ? [
          BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              connection: {
                host: config.get<string>("redis.host", "localhost"),
                port: config.get<number>("redis.port", 6379),
              },
            }),
          }),
        ]
      : []),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Tests set DB_DRIVER=sqljs (WASM sqlite, synchronized schema).
        if (process.env.DB_DRIVER === "sqljs") {
          return { type: "sqljs", autoLoadEntities: true, synchronize: true };
        }
        return {
          type: "postgres",
          host: config.get<string>("db.host"),
          port: config.get<number>("db.port"),
          username: config.get<string>("db.username"),
          password: config.get<string>("db.password"),
          database: config.get<string>("db.database"),
          autoLoadEntities: true,
          synchronize: false,
          // Apply pending migrations on boot (container path).
          migrations: ["dist/database/migrations/*.js"],
          migrationsRun: true,
        };
      },
    }),
    AuthModule,
    UsersModule,
    SuppliersModule,
    ProductsModule,
    ImportsModule,
    OffersModule,
    ExportModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
