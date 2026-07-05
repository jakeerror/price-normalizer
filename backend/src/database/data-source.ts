import "reflect-metadata";
import { DataSource } from "typeorm";

/**
 * TypeORM DataSource for the migration CLI (Postgres, production/docker).
 * The NestJS runtime builds its own DataSource from ConfigService; tests use a
 * separate sqlite DataSource with synchronize. This file is CLI-only.
 */
export default new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "pricenorm",
  password: process.env.DB_PASSWORD ?? "pricenorm",
  database: process.env.DB_NAME ?? "pricenorm",
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/database/migrations/*.ts"],
  synchronize: false,
});
