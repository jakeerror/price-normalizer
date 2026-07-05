import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";

import { AppModule } from "../src/app.module";
import { UserRole } from "../src/common/enums";
import { normalizeName } from "../src/common/normalization";
import { hashPassword } from "../src/common/security/password";
import { CanonicalProduct } from "../src/products/entities/canonical-product.entity";
import { Supplier } from "../src/suppliers/entities/supplier.entity";
import { User } from "../src/users/entities/user.entity";

export const CREDS = {
  operator: { email: "operator@example.com", password: "password123" },
  viewer: { email: "viewer@example.com", password: "password123" },
};

export interface TestContext {
  app: INestApplication;
  ds: DataSource;
  supplierId: number;
}

/** Boot a Nest app on sql.js and seed two users + a supplier. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, errorHttpStatusCode: 422 }),
  );
  await app.init();

  const ds = app.get(DataSource);
  const hash = await hashPassword("password123");
  await ds.getRepository(User).save([
    { email: CREDS.operator.email, fullName: "Op", role: UserRole.Operator, passwordHash: hash },
    { email: CREDS.viewer.email, fullName: "View", role: UserRole.Viewer, passwordHash: hash },
  ]);
  const supplier = await ds
    .getRepository(Supplier)
    .save({ name: "СтройБаза", inn: "7701234567" });

  return { app, ds, supplierId: supplier.id };
}

export async function loginToken(
  app: INestApplication,
  role: "operator" | "viewer",
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send(CREDS[role]);
  return res.body.accessToken as string;
}

export async function seedProduct(
  ds: DataSource,
  name: string,
  article: string | null,
  category = "Прочее",
  baseUnit = "pcs",
): Promise<CanonicalProduct> {
  return ds.getRepository(CanonicalProduct).save({
    name,
    normalizedName: normalizeName(name),
    article,
    category,
    baseUnit,
  });
}
