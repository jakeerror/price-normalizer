import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { createTestApp, loginToken } from "./app-factory";

describe("Catalog (e2e)", () => {
  let app: INestApplication;
  let operator: string;
  let viewer: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    operator = await loginToken(app, "operator");
    viewer = await loginToken(app, "viewer");
  });
  afterAll(async () => {
    await app.close();
  });

  const http = () => app.getHttpServer();
  const asOp = (r: request.Test) => r.set("Authorization", `Bearer ${operator}`);
  const asView = (r: request.Test) => r.set("Authorization", `Bearer ${viewer}`);

  it("forbids a viewer from creating a supplier (403)", async () => {
    const res = await asView(
      request(http()).post("/api/v1/suppliers"),
    ).send({ name: "X", inn: "7712345678" });
    expect(res.status).toBe(403);
  });

  it("lets an operator create a supplier (201)", async () => {
    const res = await asOp(request(http()).post("/api/v1/suppliers")).send({
      name: "ООО Ромашка",
      inn: "7712345678",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  it("rejects a duplicate INN with 409", async () => {
    const res = await asOp(request(http()).post("/api/v1/suppliers")).send({
      name: "Dup",
      inn: "7712345678",
    });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid INN with 422", async () => {
    const res = await asOp(request(http()).post("/api/v1/suppliers")).send({
      name: "Bad",
      inn: "123",
    });
    expect(res.status).toBe(422);
  });

  it("creates then soft-deletes a product", async () => {
    const created = await asOp(request(http()).post("/api/v1/products")).send({
      name: "Гвозди 100мм",
      category: "Крепёж",
      baseUnit: "kg",
    });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const del = await asOp(request(http()).delete(`/api/v1/products/${id}`));
    expect(del.status).toBe(204);

    const got = await asOp(request(http()).get(`/api/v1/products/${id}`));
    expect(got.body.isActive).toBe(false);
  });

  it("forbids a viewer from creating a product (403)", async () => {
    const res = await asView(request(http()).post("/api/v1/products")).send({
      name: "Y",
      category: "C",
      baseUnit: "pcs",
    });
    expect(res.status).toBe(403);
  });
});
