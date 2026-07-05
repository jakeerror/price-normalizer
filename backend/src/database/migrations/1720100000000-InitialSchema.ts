import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Initial schema (Postgres). Hand-written because no live DB is available to
 * `migration:generate` against. Enum-like columns are stored as varchar (matching
 * the entities' `simple-enum`) so the same entities run on sqlite in tests.
 * Applied automatically by the api container on startup (see docker-compose).
 */
export class InitialSchema1720100000000 implements MigrationInterface {
  name = "InitialSchema1720100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" varchar(255) NOT NULL,
        "full_name" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" varchar(32) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "inn" varchar(12) NOT NULL,
        "contact_person" varchar(255),
        "email" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_suppliers_inn" UNIQUE ("inn")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "canonical_products" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "normalized_name" varchar(255) NOT NULL,
        "article" varchar(64),
        "category" varchar(128) NOT NULL,
        "base_unit" varchar(32) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_canonical_products_article" UNIQUE ("article")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_canonical_products_normalized_name" ON "canonical_products" ("normalized_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_canonical_products_category" ON "canonical_products" ("category")`,
    );

    await queryRunner.query(`
      CREATE TABLE "import_batches" (
        "id" SERIAL PRIMARY KEY,
        "supplier_id" integer NOT NULL,
        "uploaded_by" integer NOT NULL,
        "filename" varchar(255) NOT NULL,
        "format" varchar(16) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'uploaded',
        "total_rows" integer NOT NULL DEFAULT 0,
        "matched_count" integer NOT NULL DEFAULT 0,
        "review_count" integer NOT NULL DEFAULT 0,
        "error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_import_batches_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id"),
        CONSTRAINT "fk_import_batches_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_import_batches_supplier_id" ON "import_batches" ("supplier_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "raw_rows" (
        "id" SERIAL PRIMARY KEY,
        "batch_id" integer NOT NULL,
        "row_index" integer NOT NULL,
        "raw_data" text NOT NULL,
        "parse_error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_raw_rows_batch" FOREIGN KEY ("batch_id") REFERENCES "import_batches" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_raw_rows_batch_id" ON "raw_rows" ("batch_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "price_offers" (
        "id" SERIAL PRIMARY KEY,
        "batch_id" integer NOT NULL,
        "raw_row_id" integer NOT NULL,
        "supplier_id" integer NOT NULL,
        "canonical_product_id" integer,
        "raw_name" varchar(512) NOT NULL,
        "normalized_name" varchar(512) NOT NULL,
        "raw_article" varchar(64),
        "price" numeric(14,2) NOT NULL,
        "currency" varchar(3) NOT NULL,
        "normalized_unit" varchar(32) NOT NULL,
        "confidence" numeric(4,3),
        "match_method" varchar(16) NOT NULL DEFAULT 'none',
        "match_status" varchar(32) NOT NULL,
        "match_candidates" text,
        "reviewed_by" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_price_offers_raw_row_id" UNIQUE ("raw_row_id"),
        CONSTRAINT "fk_price_offers_batch" FOREIGN KEY ("batch_id") REFERENCES "import_batches" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_price_offers_raw_row" FOREIGN KEY ("raw_row_id") REFERENCES "raw_rows" ("id"),
        CONSTRAINT "fk_price_offers_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id"),
        CONSTRAINT "fk_price_offers_product" FOREIGN KEY ("canonical_product_id") REFERENCES "canonical_products" ("id"),
        CONSTRAINT "fk_price_offers_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_price_offers_batch_id" ON "price_offers" ("batch_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_price_offers_supplier_id" ON "price_offers" ("supplier_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "price_offers"`);
    await queryRunner.query(`DROP TABLE "raw_rows"`);
    await queryRunner.query(`DROP TABLE "import_batches"`);
    await queryRunner.query(`DROP TABLE "canonical_products"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
