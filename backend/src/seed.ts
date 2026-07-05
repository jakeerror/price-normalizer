import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";

import { AppModule } from "./app.module";
import { UserRole } from "./common/enums";
import { normalizeName } from "./common/normalization";
import { hashPassword } from "./common/security/password";
import { CanonicalProduct } from "./products/entities/canonical-product.entity";
import { Supplier } from "./suppliers/entities/supplier.entity";
import { User } from "./users/entities/user.entity";

const SEED_USERS = [
  {
    email: process.env.SEED_OPERATOR_EMAIL ?? "operator@example.com",
    fullName: "Оператор Снабжения",
    role: UserRole.Operator,
    password: process.env.SEED_OPERATOR_PASSWORD ?? "password123",
  },
  {
    email: process.env.SEED_VIEWER_EMAIL ?? "viewer@example.com",
    fullName: "Наблюдатель",
    role: UserRole.Viewer,
    password: process.env.SEED_VIEWER_PASSWORD ?? "password123",
  },
];

const SEED_PRODUCTS: Array<[string, string | null, string, string]> = [
  ["Цемент М500", "CEM500", "Вяжущие", "pack"],
  ["Арматура А500С 12мм", "ARM12", "Металлопрокат", "t"],
  ["Кирпич керамический", null, "Кладочные", "pcs"],
  ["Песок строительный", null, "Инертные", "m2"],
];

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });
  const ds = app.get(DataSource);

  const users = ds.getRepository(User);
  for (const u of SEED_USERS) {
    if (!(await users.exists({ where: { email: u.email } }))) {
      await users.save(
        users.create({
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          passwordHash: await hashPassword(u.password),
        }),
      );
    }
  }

  const suppliers = ds.getRepository(Supplier);
  for (const s of [
    { name: "ООО СтройБаза", inn: "7701234567" },
    { name: "ООО МеталлТорг", inn: "7809876543" },
  ]) {
    if (!(await suppliers.exists({ where: { inn: s.inn } }))) {
      await suppliers.save(suppliers.create(s));
    }
  }

  const products = ds.getRepository(CanonicalProduct);
  for (const [name, article, category, baseUnit] of SEED_PRODUCTS) {
    if (!(await products.exists({ where: { name } }))) {
      await products.save(
        products.create({
          name,
          normalizedName: normalizeName(name),
          article,
          category,
          baseUnit,
        }),
      );
    }
  }

  await app.close();
  // eslint-disable-next-line no-console
  console.log("Seed complete.");
}

void run();
